package service

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"sharedbuy-backend/internal/repository"
)

type LifecycleReport struct {
	Timestamp     time.Time `json:"timestamp"`
	UnitsLocked   int       `json:"units_locked"`
	SharesRefunded int       `json:"shares_refunded"`
	Message       string    `json:"message"`
}

type LifecycleService struct {
	unitRepo   *repository.UnitRepository
	walletRepo *repository.WalletRepository
	stopChan   chan struct{}
	mu         sync.Mutex
	running    bool
}

func NewLifecycleService(
	unitRepo *repository.UnitRepository,
	walletRepo *repository.WalletRepository,
) *LifecycleService {
	s := &LifecycleService{
		unitRepo:   unitRepo,
		walletRepo: walletRepo,
		stopChan:   make(chan struct{}),
	}
	s.StartBackgroundWorker(30 * time.Second)
	return s
}

func (s *LifecycleService) StartBackgroundWorker(interval time.Duration) {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return
	}
	s.running = true
	s.mu.Unlock()

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
				rep, err := s.RunCheck(ctx)
				cancel()
				if err == nil && (rep.UnitsLocked > 0 || rep.SharesRefunded > 0) {
					log.Printf("⏱️ [LIFECYCLE WORKER] %s (Locked: %d, Refunded: %d)", rep.Message, rep.UnitsLocked, rep.SharesRefunded)
				}
			case <-s.stopChan:
				return
			}
		}
	}()
}

func (s *LifecycleService) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.running {
		close(s.stopChan)
		s.running = false
	}
}

func (s *LifecycleService) RunCheck(ctx context.Context) (*LifecycleReport, error) {
	refundFn := func(userID string, amountKobo int64, reason, refID string) error {
		if s.walletRepo != nil {
			_, err := s.walletRepo.Credit(ctx, userID, amountKobo, reason, refID)
			return err
		}
		return nil
	}

	locked, refunded, err := s.unitRepo.CheckLifecycleAndExpire(ctx, refundFn)
	if err != nil {
		return nil, err
	}

	msg := "Lifecycle check completed successfully."
	if locked > 0 || refunded > 0 {
		msg = fmtMsg(locked, refunded)
	}

	return &LifecycleReport{
		Timestamp:      time.Now(),
		UnitsLocked:    locked,
		SharesRefunded: refunded,
		Message:        msg,
	}, nil
}

func fmtMsg(locked, refunded int) string {
	return fmt.Sprintf("Units checked: %d locked, %d refunded.", locked, refunded)
}
