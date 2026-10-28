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
	if r.db == nil {
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

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, COALESCE(distributor_id, ''), distributor_name, distributor_phone,
		       COALESCE(product_id, ''), product_name, category, pack_size,
		       price_per_pack_kobo, delivery_fee_kobo, min_order_packs, available_packs,
		       warehouse_location, status, updated_at
		FROM distributor_commodities
		WHERE ($1 = '' OR distributor_id = $1)
		ORDER BY updated_at DESC
	`, distributorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.DistributorCommodity
	for rows.Next() {
		var c domain.DistributorCommodity
		if err := rows.Scan(
			&c.ID, &c.DistributorID, &c.DistributorName, &c.DistributorPhone,
			&c.ProductID, &c.ProductName, &c.Category, &c.PackSize,
			&c.PricePerPackKobo, &c.DeliveryFeeKobo, &c.MinOrderPacks, &c.AvailablePacks,
			&c.WarehouseLocation, &c.Status, &c.UpdatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, c)
	}
	return result, nil
}

func (r *DistributorRepository) CreateCommodity(ctx context.Context, comm *domain.DistributorCommodity) error {
	if comm.ID == "" {
		comm.ID = fmt.Sprintf("comm-%d", time.Now().UnixNano()%1000000)
	}
	comm.UpdatedAt = time.Now()
	if comm.Status == "" {
		comm.Status = "ACTIVE"
	}

	if r.db == nil {
		r.mu.Lock()
		defer r.mu.Unlock()
		r.commodities = append([]domain.DistributorCommodity{*comm}, r.commodities...)
		return nil
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO distributor_commodities (
			id, distributor_id, distributor_name, distributor_phone,
			product_id, product_name, category, pack_size,
			price_per_pack_kobo, delivery_fee_kobo, min_order_packs, available_packs,
			warehouse_location, status, updated_at
		) VALUES ($1, NULLIF($2, ''), $3, $4, NULLIF($5, ''), $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
	`, comm.ID, comm.DistributorID, comm.DistributorName, comm.DistributorPhone,
		comm.ProductID, comm.ProductName, comm.Category, comm.PackSize,
		comm.PricePerPackKobo, comm.DeliveryFeeKobo, comm.MinOrderPacks, comm.AvailablePacks,
		comm.WarehouseLocation, comm.Status)
	return err
}

func (r *DistributorRepository) UpdateCommodity(ctx context.Context, comm *domain.DistributorCommodity) error {
	if r.db == nil {
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

	res, err := r.db.ExecContext(ctx, `
		UPDATE distributor_commodities
		SET product_name = $1, category = $2, pack_size = $3,
		    price_per_pack_kobo = $4, delivery_fee_kobo = $5, min_order_packs = $6,
		    available_packs = $7, warehouse_location = $8, status = $9, updated_at = NOW()
		WHERE id = $10
	`, comm.ProductName, comm.Category, comm.PackSize,
		comm.PricePerPackKobo, comm.DeliveryFeeKobo, comm.MinOrderPacks,
		comm.AvailablePacks, comm.WarehouseLocation, comm.Status, comm.ID)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return errors.New("commodity quote not found")
	}
	return nil
}

func (r *DistributorRepository) ListPurchaseOrders(ctx context.Context, distributorID string) ([]domain.PurchaseOrder, error) {
	if r.db == nil {
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

	rows, err := r.db.QueryContext(ctx, `
		SELECT id, order_number, COALESCE(distributor_id, ''), distributor_name, distributor_phone,
		       COALESCE(created_by_admin_id, ''), destination_area, total_packs,
		       total_goods_cost_kobo, total_delivery_fee_kobo, total_amount_kobo,
		       status, driver_name, driver_phone, vehicle_plate, waybill_number,
		       COALESCE(notes, ''), ordered_at, dispatched_at, delivered_at
		FROM purchase_orders
		WHERE ($1 = '' OR distributor_id = $1)
		ORDER BY ordered_at DESC
	`, distributorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.PurchaseOrder
	for rows.Next() {
		var o domain.PurchaseOrder
		if err := rows.Scan(
			&o.ID, &o.OrderNumber, &o.DistributorID, &o.DistributorName, &o.DistributorPhone,
			&o.CreatedByAdminID, &o.DestinationArea, &o.TotalPacks,
			&o.TotalGoodsCostKobo, &o.TotalDeliveryFeeKobo, &o.TotalAmountKobo,
			&o.Status, &o.DriverName, &o.DriverPhone, &o.VehiclePlate, &o.WaybillNumber,
			&o.Notes, &o.OrderedAt, &o.DispatchedAt, &o.DeliveredAt,
		); err != nil {
			return nil, err
		}
		result = append(result, o)
	}
	return result, nil
}

func (r *DistributorRepository) CreatePurchaseOrder(ctx context.Context, po *domain.PurchaseOrder) error {
	if po.ID == "" {
		po.ID = fmt.Sprintf("po-%d", time.Now().UnixNano()%1000000)
	}
	if po.OrderNumber == "" {
		po.OrderNumber = fmt.Sprintf("PO-2026-PIWOYI-%03d", time.Now().Unix()%1000)
	}
	po.OrderedAt = time.Now()
	if po.Status == "" {
		po.Status = "PENDING"
	}

	if r.db == nil {
		r.mu.Lock()
		defer r.mu.Unlock()
		r.orders = append([]domain.PurchaseOrder{*po}, r.orders...)
		return nil
	}

	_, err := r.db.ExecContext(ctx, `
		INSERT INTO purchase_orders (
			id, order_number, distributor_id, distributor_name, distributor_phone,
			created_by_admin_id, destination_area, total_packs,
			total_goods_cost_kobo, total_delivery_fee_kobo, total_amount_kobo,
			status, notes, ordered_at
		) VALUES ($1, $2, NULLIF($3, ''), $4, $5, NULLIF($6, ''), $7, $8, $9, $10, $11, $12, $13, NOW())
	`, po.ID, po.OrderNumber, po.DistributorID, po.DistributorName, po.DistributorPhone,
		po.CreatedByAdminID, po.DestinationArea, po.TotalPacks,
		po.TotalGoodsCostKobo, po.TotalDeliveryFeeKobo, po.TotalAmountKobo,
		po.Status, po.Notes)
	return err
}

func (r *DistributorRepository) DispatchPurchaseOrder(
	ctx context.Context,
	poID, driverName, driverPhone, vehiclePlate, waybillNumber string,
) (*domain.PurchaseOrder, error) {
	if r.db == nil {
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

	_, err := r.db.ExecContext(ctx, `
		UPDATE purchase_orders
		SET status = 'DISPATCHED', driver_name = $1, driver_phone = $2,
		    vehicle_plate = $3, waybill_number = $4, dispatched_at = NOW()
		WHERE id = $5
	`, driverName, driverPhone, vehiclePlate, waybillNumber, poID)
	if err != nil {
		return nil, err
	}
	orders, _ := r.ListPurchaseOrders(ctx, "")
	for _, o := range orders {
		if o.ID == poID {
			oCopy := o
			return &oCopy, nil
		}
	}
	return nil, errors.New("purchase order not found")
}

func (r *DistributorRepository) MarkOrderDelivered(ctx context.Context, poID string) (*domain.PurchaseOrder, []string, error) {
	if r.db == nil {
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

	_, err := r.db.ExecContext(ctx, `
		UPDATE purchase_orders
		SET status = 'DELIVERED', delivered_at = NOW()
		WHERE id = $1
	`, poID)
	if err != nil {
		return nil, nil, err
	}
	orders, _ := r.ListPurchaseOrders(ctx, "")
	for _, o := range orders {
		if o.ID == poID {
			oCopy := o
			return &oCopy, oCopy.AssociatedUnitIDs, nil
		}
	}
	return nil, nil, errors.New("purchase order not found")
}
