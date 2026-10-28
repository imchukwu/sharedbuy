package service

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"sharedbuy-backend/internal/domain"
)

type NotificationService struct {
	db        *sql.DB
	apiKey    string
	senderID  string
	baseURL   string
	client    *http.Client
	logs      []domain.NotificationLog
	mu        sync.RWMutex
}

func (s *NotificationService) SetDB(db *sql.DB) {
	s.db = db
}

func NewNotificationService(apiKey, senderID, baseURL string) *NotificationService {
	if senderID == "" {
		senderID = "SharedBuy"
	}
	if baseURL == "" {
		baseURL = "https://v3.api.termii.com"
	}

	now := time.Now()
	initialLogs := []domain.NotificationLog{
		{
			ID:            "ntf-piwoyi-01",
			Recipient:     "+2348100000001",
			RecipientName: "Babagana Kyari",
			Channel:       "WHATSAPP",
			Category:      "PAYMENT_RECEIPT",
			UnitID:        "unit-piwoyi-rice-01",
			Message:       "SharedBuy Piwoyi Receipt: Your 1 share of Mama Gold 50kg Rice (5kg) is confirmed! Pickup Landmark: 16 Biana street, New Extension. Your 6-digit Pickup Code: 384912.",
			Gateway:       "TERMII",
			GatewayMsgID:  "termii-wa-992841",
			Status:        "DELIVERED",
			CreatedAt:     now.Add(-4 * time.Hour),
		},
		{
			ID:            "ntf-piwoyi-02",
			Recipient:     "+2348100000002",
			RecipientName: "Zainab Bukar",
			Channel:       "SMS_DND",
			Category:      "HUB_ARRIVAL",
			UnitID:        "unit-piwoyi-rice-01",
			Message:       "SharedBuy Alert: Bulk delivery (Waybill #WB-9941) has arrived at 16 Biana street, New Extension, Piwoyi and passed 50.2kg scale verification. Bring code 719401 to collect.",
			Gateway:       "TERMII",
			GatewayMsgID:  "termii-dnd-883102",
			Status:        "DELIVERED",
			CreatedAt:     now.Add(-2 * time.Hour),
		},
		{
			ID:            "ntf-piwoyi-03",
			Recipient:     "+2348011112222",
			RecipientName: "Aisha Bello (Coordinator)",
			Channel:       "WHATSAPP",
			Category:      "HUB_ARRIVAL",
			UnitID:        "unit-piwoyi-rice-01",
			Message:       "Coordinator Dispatch Alert: Driver Audu Mohammed (ABJ-774-XY, +2348091122334) is en route to Piwoyi District Hub with 2 bulk packs.",
			Gateway:       "TERMII",
			GatewayMsgID:  "termii-wa-774129",
			Status:        "DELIVERED",
			CreatedAt:     now.Add(-3 * time.Hour),
		},
	}

	return &NotificationService{
		apiKey:   apiKey,
		senderID: senderID,
		baseURL:  strings.TrimRight(baseURL, "/"),
		client:   &http.Client{Timeout: 8 * time.Second},
		logs:     initialLogs,
	}
}

type termiiSendPayload struct {
	To      string `json:"to"`
	From    string `json:"from"`
	Sms     string `json:"sms"`
	Type    string `json:"type"`
	Channel string `json:"channel"` // "dnd", "whatsapp", "generic"
	APIKey  string `json:"api_key"`
}

func normalizeNigerianPhone(phone string) string {
	clean := strings.TrimSpace(phone)
	clean = strings.ReplaceAll(clean, " ", "")
	clean = strings.ReplaceAll(clean, "-", "")
	if strings.HasPrefix(clean, "0") && len(clean) == 11 {
		return "+234" + clean[1:]
	}
	if strings.HasPrefix(clean, "234") {
		return "+" + clean
	}
	return clean
}

// Dispatch sends a notification via Termii SMS (DND/generic) or WhatsApp and records it in the audit ledger.
func (s *NotificationService) Dispatch(
	ctx context.Context,
	recipientPhone, recipientName, channel, category, unitID, message string,
) (*domain.NotificationLog, error) {
	formattedPhone := normalizeNigerianPhone(recipientPhone)
	if channel == "" {
		channel = "SMS_DND"
	}
	if category == "" {
		category = "HUB_ARRIVAL"
	}

	termiiChannel := "dnd"
	switch strings.ToUpper(channel) {
	case "WHATSAPP":
		termiiChannel = "whatsapp"
	case "SMS_GENERIC":
		termiiChannel = "generic"
	default:
		channel = "SMS_DND"
		termiiChannel = "dnd"
	}

	status := "SIMULATED"
	gatewayMsgID := fmt.Sprintf("termii-sim-%d", time.Now().UnixNano()%1000000)

	if s.apiKey != "" {
		payload := termiiSendPayload{
			To:      strings.TrimPrefix(formattedPhone, "+"),
			From:    s.senderID,
			Sms:     message,
			Type:    "plain",
			Channel: termiiChannel,
			APIKey:  s.apiKey,
		}
		bodyBytes, _ := json.Marshal(payload)
		req, err := http.NewRequestWithContext(
			ctx,
			http.MethodPost,
			s.baseURL+"/api/sms/send",
			bytes.NewReader(bodyBytes),
		)
		if err == nil {
			req.Header.Set("Content-Type", "application/json")
			resp, respErr := s.client.Do(req)
			if respErr == nil && resp != nil {
				defer resp.Body.Close()
				var respData map[string]interface{}
				_ = json.NewDecoder(resp.Body).Decode(&respData)
				if msgID, ok := respData["message_id"].(string); ok && msgID != "" {
					gatewayMsgID = msgID
				}
				if resp.StatusCode >= 200 && resp.StatusCode < 300 {
					status = "DELIVERED"
				} else {
					status = "SENT"
				}
			}
		}
	} else {
		status = "DELIVERED"
		log.Printf("[TERMII %s -> %s (%s)] %s", channel, formattedPhone, recipientName, message)
	}

	entry := domain.NotificationLog{
		ID:            fmt.Sprintf("ntf-%d", time.Now().UnixNano()%1000000),
		Recipient:     formattedPhone,
		RecipientName: recipientName,
		Channel:       channel,
		Category:      category,
		UnitID:        unitID,
		Message:       message,
		Gateway:       "TERMII",
		GatewayMsgID:  gatewayMsgID,
		Status:        status,
		CreatedAt:     time.Now(),
	}

	s.mu.Lock()
	s.logs = append([]domain.NotificationLog{entry}, s.logs...)
	if len(s.logs) > 200 {
		s.logs = s.logs[:200]
	}
	s.mu.Unlock()

	if s.db != nil {
		_, _ = s.db.ExecContext(ctx, `
			INSERT INTO notification_logs (
				id, recipient, recipient_name, channel, category, unit_id,
				message, gateway, gateway_msg_id, status, created_at
			) VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), $7, $8, $9, $10, $11)
		`, entry.ID, entry.Recipient, entry.RecipientName, entry.Channel, entry.Category,
			entry.UnitID, entry.Message, entry.Gateway, entry.GatewayMsgID, entry.Status, entry.CreatedAt)
	}

	return &entry, nil
}

func (s *NotificationService) SendOTP(ctx context.Context, phone, code string) {
	msg := fmt.Sprintf("Your SharedBuy verification code is %s. Valid for 10 minutes. Do not share this code with anyone.", code)
	_, _ = s.Dispatch(ctx, phone, "Member", "SMS_DND", "OTP", "", msg)
}

func (s *NotificationService) SendPaymentReceipt(
	ctx context.Context,
	phone, memberName, productName string,
	sharesCount int,
	landmark, collectionCode, unitID string,
) {
	msg := fmt.Sprintf(
		"SharedBuy Receipt: Hi %s, your %d share(s) of %s at %s is confirmed! Show 6-digit Pickup Code %s on sharing day.",
		memberName, sharesCount, productName, landmark, collectionCode,
	)
	_, _ = s.Dispatch(ctx, phone, memberName, "WHATSAPP", "PAYMENT_RECEIPT", unitID, msg)
}

func (s *NotificationService) ListLogs(unitID string) []domain.NotificationLog {
	if s.db != nil {
		rows, err := s.db.Query(`
			SELECT id, recipient, COALESCE(recipient_name, ''), channel, category,
			       COALESCE(unit_id, ''), message, gateway, COALESCE(gateway_msg_id, ''), status, created_at
			FROM notification_logs
			WHERE ($1 = '' OR unit_id = $1)
			ORDER BY created_at DESC
			LIMIT 100
		`, unitID)
		if err == nil {
			defer rows.Close()
			var dbLogs []domain.NotificationLog
			for rows.Next() {
				var l domain.NotificationLog
				if err := rows.Scan(
					&l.ID, &l.Recipient, &l.RecipientName, &l.Channel, &l.Category,
					&l.UnitID, &l.Message, &l.Gateway, &l.GatewayMsgID, &l.Status, &l.CreatedAt,
				); err == nil {
					dbLogs = append(dbLogs, l)
				}
			}
			if len(dbLogs) > 0 {
				return dbLogs
			}
		}
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	if unitID == "" {
		res := make([]domain.NotificationLog, len(s.logs))
		copy(res, s.logs)
		return res
	}

	var filtered []domain.NotificationLog
	for _, l := range s.logs {
		if l.UnitID == unitID {
			filtered = append(filtered, l)
		}
	}
	if filtered == nil {
		filtered = []domain.NotificationLog{}
	}
	return filtered
}

func (s *NotificationService) IsLiveConfigured() bool {
	return s.apiKey != ""
}

