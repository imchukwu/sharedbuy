package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/hex"
	"fmt"
	"testing"

	"sharedbuy-backend/internal/repository"
)

func TestPriority3PaystackAndWalletSecurity(t *testing.T) {
	ctx := context.Background()
	userRepo := repository.NewUserRepository(nil)
	unitRepo := repository.NewUnitRepository(nil)
	walletRepo := repository.NewWalletRepository(nil, userRepo)

	walletSvc := NewWalletService(walletRepo, userRepo, unitRepo, "mock", "pk_test_mock")
	paymentSvc := NewPaymentService(unitRepo, userRepo, walletRepo, "mock", "pk_test_mock")
	paymentSvc.SetWalletService(walletSvc)

	// 1. Production mode (isDev=false) MUST reject unknown/fake top-up references instead of crediting 500000 kobo
	_, err := walletSvc.VerifyTopUp(ctx, "mem-01", "wtop_fake_uninitialized_ref")
	if err == nil {
		t.Fatalf("expected unknown top-up reference to be rejected in production mode")
	}

	// 2. NUBAN Account Resolver must validate 10-digit account numbers
	_, _, err = walletSvc.ResolveBankAccount(ctx, "mem-01", "GTBank", "12345")
	if err == nil {
		t.Fatalf("expected short account number to be rejected")
	}
	acctName, bankCode, err := walletSvc.ResolveBankAccount(ctx, "mem-01", "GTBank", "0123456789")
	if err != nil || acctName == "" || bankCode != "058" {
		t.Fatalf("expected valid 10-digit NUBAN resolution, got name=%s code=%s err=%v", acctName, bankCode, err)
	}

	// 3. Paystack Webhook routing for Wallet Top-Up (wtop_...) with HMAC-SHA512 signature
	initResp, err := walletSvc.InitializeTopUp(ctx, "mem-01", 300000, "http://localhost:5173/wallet")
	if err != nil {
		t.Fatalf("InitializeTopUp failed: %v", err)
	}

	webhookPayload := []byte(fmt.Sprintf(`{
		"event": "charge.success",
		"data": {
			"reference": "%s",
			"status": "success",
			"amount": 300000,
			"metadata": {
				"user_id": "mem-01",
				"action": "WALLET_TOPUP"
			}
		}
	}`, initResp.Reference))

	mac := hmac.New(sha512.New, []byte("mock"))
	mac.Write(webhookPayload)
	sig := hex.EncodeToString(mac.Sum(nil))

	if err := paymentSvc.HandleWebhook(ctx, sig, webhookPayload); err != nil {
		t.Fatalf("HandleWebhook for wallet top-up failed: %v", err)
	}

	// 4. Withdrawal Rejection must automatically refund 100% back to the member's wallet
	beforeSummary, _ := walletSvc.GetSummary(ctx, "mem-01")
	wdr, err := walletSvc.RequestWithdrawal(ctx, "mem-01", 200000, "GTBank", "0123456789", acctName)
	if err != nil {
		t.Fatalf("RequestWithdrawal failed: %v", err)
	}
	afterDebit, _ := walletSvc.GetSummary(ctx, "mem-01")
	if afterDebit.BalanceKobo != beforeSummary.BalanceKobo-200000 {
		t.Fatalf("expected balance to decrease by 200000 kobo")
	}

	// Reject withdrawal and confirm automatic reversal
	_, err = walletSvc.ProcessWithdrawal(ctx, wdr.ID, "REJECTED")
	if err != nil {
		t.Fatalf("ProcessWithdrawal REJECTED failed: %v", err)
	}
	afterReversal, _ := walletSvc.GetSummary(ctx, "mem-01")
	if afterReversal.BalanceKobo != beforeSummary.BalanceKobo {
		t.Fatalf("expected 100%% wallet reversal on rejected withdrawal: got %d, want %d", afterReversal.BalanceKobo, beforeSummary.BalanceKobo)
	}
}

