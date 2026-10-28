package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"time"

	"sharedbuy-backend/internal/domain"
)

type DistributorRepository struct {
	db           *sql.DB
	commodities  []domain.DistributorCommodity
	orders       []domain.PurchaseOrder
	mu           sync.RWMutex
}

func NewDistributorRepository(db *sql.DB) *DistributorRepository {
	now := time.Now()
	dispatchedAt := now.Add(-2 * time.Hour)
	driverName := "Audu Mohammed"
	driverPhone := "+2348091122334"
	plate := "ABJ-774-XY"
	waybill := "WB-9941"

	return &DistributorRepository{
		db: db,
		commodities: []domain.DistributorCommodity{
			{
				ID:                "comm-rice-01",
				DistributorID:     "user-dist-dahiru",
				DistributorName:   "Alhaji Dahiru (Northern Agro Millers)",
				DistributorPhone:  "+2348055556666",
				ProductID:         "prod-rice-mama-gold-50kg",
				ProductName:       "Mama Gold Premium Long Grain Parboiled Rice",
				Category:          "Grains",
				PackSize:          "50kg Bag",
				PricePerPackKobo:  6650000, // ₦66,500
				DeliveryFeeKobo:   1312500, // ₦13,125
				MinOrderPacks:     1,
				AvailablePacks:    150,
				WarehouseLocation: "Idu Industrial Layout, Abuja Central Depot",
				Status:            "ACTIVE",
				UpdatedAt:         now.Add(-48 * time.Hour),
			},
			{
				ID:                "comm-milk-02",
				DistributorID:     "user-dist-dahiru",
				DistributorName:   "Alhaji Dahiru (Northern Agro Millers & Dairy)",
				DistributorPhone:  "+2348055556666",
				ProductID:         "prod-lactorich-milk-25kg",
				ProductName:       "Lactorich Instant Full Cream Powdered Milk",
				Category:          "Dairy",
				PackSize:          "25kg Bag",
				PricePerPackKobo:  6992000, // ₦69,920
				DeliveryFeeKobo:   1380000, // ₦13,800
				MinOrderPacks:     1,
				AvailablePacks:    80,
				WarehouseLocation: "Gwagwalada Commercial Depot, Abuja",
				Status:            "ACTIVE",
				UpdatedAt:         now.Add(-24 * time.Hour),
			},
			{
				ID:                "comm-crayfish-03",
				DistributorID:     "user-dist-dahiru",
				DistributorName:   "Alhaji Dahiru (Northern Agro Millers & Seafood)",
				DistributorPhone:  "+2348055556666",
				ProductID:         "prod-crayfish-bag",
				ProductName:       "Oron Premium Dried Crayfish",
				Category:          "Seafood & Seasonings",
				PackSize:          "Large Sack (Bag)",
				PricePerPackKobo:  5700000, // ₦57,000
				DeliveryFeeKobo:   1125000, // ₦11,250
				MinOrderPacks:     1,
				AvailablePacks:    45,
				WarehouseLocation: "Dei-Dei Regional Terminal, Abuja",
				Status:            "ACTIVE",
				UpdatedAt:         now.Add(-12 * time.Hour),
			},
			{
				ID:                "comm-palmoil-04",
				DistributorID:     "user-dist-dahiru",
				DistributorName:   "Alhaji Dahiru (Northern Agro Millers & Oils)",
				DistributorPhone:  "+2348055556666",
				ProductID:         "prod-palm-oil-25l",
				ProductName:       "Direct Mill Pure Red Palm Oil",
				Category:          "Oils",
				PackSize:          "25L Gallon",
				PricePerPackKobo:  6384000, // ₦63,840
				DeliveryFeeKobo:   1260000, // ₦12,600
				MinOrderPacks:     1,
				AvailablePacks:    60,
				WarehouseLocation: "Nyanya Central Depot, Abuja",
				Status:            "ACTIVE",
				UpdatedAt:         now.Add(-6 * time.Hour),
			},
		},
		orders: []domain.PurchaseOrder{
			{
				ID:                   "po-piwoyi-001",
				OrderNumber:          "PO-2026-PIWOYI-001",
				DistributorID:        "user-dist-dahiru",
				DistributorName:      "Alhaji Dahiru (Northern Agro Millers)",
				DistributorPhone:     "+2348055556666",
				CreatedByAdminID:     "user-admin-01",
				DestinationArea:      "Piwoyi District Hub, Abuja",
				DestinationLandmarks: []string{"16 Biana street, New Extension", "Behind Salam Salam"},
				TotalPacks:           2,
				TotalGoodsCostKobo:   13300000, // ₦133,000
				TotalDeliveryFeeKobo: 2625000,  // ₦26,250
				TotalAmountKobo:      15925000, // ₦159,250
				Status:               "DISPATCHED",
				AssociatedUnitIDs:    []string{"unit-piwoyi-rice-01"},
				DriverName:           &driverName,
				DriverPhone:          &driverPhone,
				VehiclePlate:         &plate,
				WaybillNumber:        &waybill,
				Notes:                "Bulk truck dispatch to Piwoyi estate hubs. Coordinator Aisha notified.",
				OrderedAt:            now.Add(-6 * time.Hour),
				DispatchedAt:         &dispatchedAt,
			},
		},
	}
}

func (r *DistributorRepository) ListCommodities(ctx context.Context, distributorID string) ([]domain.DistributorCommodity, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []domain.DistributorCommodity
	for _, c := range r.commodities {
		if distributorID == "" || c.DistributorID == distributorID {
			result = append(result, c)
		}
	}
	return result, nil
}

func (r *DistributorRepository) CreateCommodity(ctx context.Context, comm *domain.DistributorCommodity) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if comm.ID == "" {
		comm.ID = fmt.Sprintf("comm-%d", time.Now().UnixNano()%1000000)
	}
	comm.UpdatedAt = time.Now()
	if comm.Status == "" {
		comm.Status = "ACTIVE"
	}

	r.commodities = append([]domain.DistributorCommodity{*comm}, r.commodities...)
	return nil
}

func (r *DistributorRepository) UpdateCommodity(ctx context.Context, comm *domain.DistributorCommodity) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	for i := range r.commodities {
		if r.commodities[i].ID == comm.ID {
			comm.UpdatedAt = time.Now()
			r.commodities[i] = *comm
			return nil
		}
	}
	return errors.New("commodity quote not found")
}

func (r *DistributorRepository) ListPurchaseOrders(ctx context.Context, distributorID string) ([]domain.PurchaseOrder, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var result []domain.PurchaseOrder
	for _, o := range r.orders {
		if distributorID == "" || o.DistributorID == distributorID {
			result = append(result, o)
		}
	}
	return result, nil
}

func (r *DistributorRepository) CreatePurchaseOrder(ctx context.Context, po *domain.PurchaseOrder) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if po.ID == "" {
		po.ID = fmt.Sprintf("po-%d", time.Now().UnixNano()%1000000)
	}
	if po.OrderNumber == "" {
		po.OrderNumber = fmt.Sprintf("PO-2026-PIWOYI-%03d", len(r.orders)+1)
	}
	po.OrderedAt = time.Now()
	if po.Status == "" {
		po.Status = "PENDING"
	}

	r.orders = append([]domain.PurchaseOrder{*po}, r.orders...)
	return nil
}

func (r *DistributorRepository) DispatchPurchaseOrder(
	ctx context.Context,
	poID, driverName, driverPhone, vehiclePlate, waybillNumber string,
) (*domain.PurchaseOrder, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	for i := range r.orders {
		if r.orders[i].ID == poID {
			r.orders[i].Status = "DISPATCHED"
			r.orders[i].DriverName = &driverName
			r.orders[i].DriverPhone = &driverPhone
			r.orders[i].VehiclePlate = &vehiclePlate
			r.orders[i].WaybillNumber = &waybillNumber
			r.orders[i].DispatchedAt = &now
			orderCopy := r.orders[i]
			return &orderCopy, nil
		}
	}
	return nil, errors.New("purchase order not found")
}

func (r *DistributorRepository) MarkOrderDelivered(ctx context.Context, poID string) (*domain.PurchaseOrder, []string, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	for i := range r.orders {
		if r.orders[i].ID == poID {
			r.orders[i].Status = "DELIVERED"
			r.orders[i].DeliveredAt = &now
			orderCopy := r.orders[i]
			return &orderCopy, r.orders[i].AssociatedUnitIDs, nil
		}
	}
	return nil, nil, errors.New("purchase order not found")
}
