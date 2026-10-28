package repository

import (
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"sharedbuy-backend/internal/domain"
)

var defaultAreas = []domain.Area{
	{
		ID:          "area-piwoyi-abuja",
		Name:        "Piwoyi District Hub",
		Locality:    "Piwoyi",
		City:        "Abuja",
		State:       "FCT",
		Country:     "Nigeria",
		CountryCode: "NG",
		Currency:    "NGN",
		LaunchPhase: "LIVE",
		IsActive:    true,
		CreatedAt:   time.Now().Add(-30 * 24 * time.Hour),
		Hubs: []domain.CollectionHub{
			{
				ID:       "hub-piwoyi-biana",
				AreaID:   "area-piwoyi-abuja",
				Name:     "Piwoyi New Extension Hub",
				Landmark: "16 Biana street, New Extension",
				Address:  "16 Biana street, New Extension, Piwoyi, Abuja",
				MapURL:   "https://www.google.com/maps/search/?api=1&query=16+Biana+street+New+Extension+Piwoyi+Abuja",
				IsActive: true,
			},
			{
				ID:       "hub-piwoyi-salam",
				AreaID:   "area-piwoyi-abuja",
				Name:     "Salam Salam Community Hub",
				Landmark: "Behind Salam Salam",
				Address:  "Behind Salam Salam, Piwoyi, Abuja",
				MapURL:   "https://www.google.com/maps/search/?api=1&query=Behind+Salam+Salam+Piwoyi+Abuja",
				IsActive: true,
			},
			{
				ID:       "hub-piwoyi-sarah",
				AreaID:   "area-piwoyi-abuja",
				Name:     "Sarah Dominion Hub",
				Landmark: "Behind Sarah Dominion School",
				Address:  "Behind Sarah Dominion School, Piwoyi, Abuja",
				MapURL:   "https://www.google.com/maps/search/?api=1&query=Behind+Sarah+Dominion+School+Piwoyi+Abuja",
				IsActive: true,
			},
			{
				ID:       "hub-piwoyi-bakery",
				AreaID:   "area-piwoyi-abuja",
				Name:     "Piwoyi Bakery Hub",
				Landmark: "By Bakery, Piwoyi Main Road",
				Address:  "By Bakery, Piwoyi, Abuja",
				MapURL:   "https://www.google.com/maps/search/?api=1&query=By+Bakery+Piwoyi+Abuja",
				IsActive: true,
			},
		},
	},
	{
		ID:          "area-lugbe-abuja",
		Name:        "Lugbe Airport Road Hub",
		Locality:    "Lugbe",
		City:        "Abuja",
		State:       "FCT",
		Country:     "Nigeria",
		CountryCode: "NG",
		Currency:    "NGN",
		LaunchPhase: "EXPANDING",
		IsActive:    true,
		CreatedAt:   time.Now().Add(-15 * 24 * time.Hour),
		Hubs: []domain.CollectionHub{
			{
				ID:       "hub-lugbe-fha",
				AreaID:   "area-lugbe-abuja",
				Name:     "FHA Lugbe Phase 1 Hub",
				Landmark: "Opposite FHA Police Signboard, Lugbe",
				Address:  "FHA Estate Phase 1, Airport Road, Lugbe, Abuja",
				MapURL:   "https://www.google.com/maps/search/?api=1&query=FHA+Estate+Lugbe+Abuja",
				IsActive: true,
			},
			{
				ID:       "hub-lugbe-trademore",
				AreaID:   "area-lugbe-abuja",
				Name:     "Trademore Estate Gate Hub",
				Landmark: "Beside Trademore Pharmacy",
				Address:  "Trademore Mega City Estate, Lugbe, Abuja",
				MapURL:   "https://www.google.com/maps/search/?api=1&query=Trademore+Estate+Lugbe+Abuja",
				IsActive: true,
			},
		},
	},
	{
		ID:          "area-gwarinpa-abuja",
		Name:        "Gwarinpa Estate Hub",
		Locality:    "Gwarinpa",
		City:        "Abuja",
		State:       "FCT",
		Country:     "Nigeria",
		CountryCode: "NG",
		Currency:    "NGN",
		LaunchPhase: "EXPANDING",
		IsActive:    true,
		CreatedAt:   time.Now().Add(-10 * 24 * time.Hour),
		Hubs: []domain.CollectionHub{
			{
				ID:       "hub-gwarinpa-3rd-ave",
				AreaID:   "area-gwarinpa-abuja",
				Name:     "Gwarinpa 3rd Avenue Hub",
				Landmark: "3rd Avenue by Charley Boy Bus Stop",
				Address:  "3rd Avenue, Gwarinpa Estate, Abuja",
				MapURL:   "https://www.google.com/maps/search/?api=1&query=3rd+Avenue+Gwarinpa+Abuja",
				IsActive: true,
			},
		},
	},
}

var defaultProducts = []domain.Product{
	{
		ID:            "prod-rice-mama-gold-50kg",
		Name:          "Mama Gold Premium Long Grain Parboiled Rice",
		Category:      "Grains",
		ImageURL:      "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
		Description:   "Grade-A stone-free Nigerian parboiled rice in sealed 50kg bag. Direct bulk order from domestic millers.",
		PackSize:      "50kg Bag",
		UnitOfShare:   "5kg Share",
		SharesPerPack: 10,
		IsActive:      true,
		CreatedAt:     time.Now().Add(-30 * 24 * time.Hour),
	},
	{
		ID:            "prod-lactorich-milk-25kg",
		Name:          "Lactorich Instant Full Cream Powdered Milk",
		Category:      "Dairy",
		ImageURL:      "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80",
		Description:   "Rich, creamy full-cream instant milk powder in commercial wholesale 25kg bag. Ideal for home use, tea, and cereals.",
		PackSize:      "25kg Bag",
		UnitOfShare:   "2.5kg Share",
		SharesPerPack: 10,
		IsActive:      true,
		CreatedAt:     time.Now().Add(-30 * 24 * time.Hour),
	},
	{
		ID:            "prod-crayfish-bag",
		Name:          "Oron Premium Dried Crayfish",
		Category:      "Seafood & Seasonings",
		ImageURL:      "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80",
		Description:   "Crisp, sweet, sand-free dried red crayfish sourced directly from coastal landing jetties.",
		PackSize:      "Large Sack (Bag)",
		UnitOfShare:   "Paint Bucket Share (~2kg)",
		SharesPerPack: 8,
		IsActive:      true,
		CreatedAt:     time.Now().Add(-30 * 24 * time.Hour),
	},
	{
		ID:            "prod-palm-oil-25l",
		Name:          "Direct Mill Pure Red Palm Oil",
		Category:      "Oils",
		ImageURL:      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
		Description:   "100% pure, unadulterated first-press red palm oil in 25-liter gallon direct from palm processing mills.",
		PackSize:      "25L Gallon",
		UnitOfShare:   "5L Share",
		SharesPerPack: 5,
		IsActive:      true,
		CreatedAt:     time.Now().Add(-30 * 24 * time.Hour),
	},
}

func getMockUnits() []domain.Unit {
	now := time.Now()
	units := []domain.Unit{
		{
			ID:                      "unit-piwoyi-rice-01",
			ProductID:               "prod-rice-mama-gold-50kg",
			ProductName:             "Mama Gold Premium Long Grain Parboiled Rice",
			ProductCategory:         "Grains",
			ProductImageURL:         "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
			ProductPackSize:         "50kg Bag",
			UnitOfShare:             "5kg Share",
			ManagerID:               "user-mgr-aisha",
			ManagerName:             "Aisha Bello",
			ManagerPhone:            "+2348011112222",
			ManagerRating:           4.95,
			AreaID:                  "area-piwoyi-abuja",
			AreaName:                "Piwoyi District Hub",
			AreaLocality:            "Piwoyi",
			AreaCity:                "Abuja",
			AreaState:               "FCT",
			AreaCountry:             "Nigeria",
			HubID:                   "hub-piwoyi-biana",
			CollectionAddress:       "16 Biana street, New Extension, Piwoyi, Abuja",
			CollectionLandmark:      "16 Biana street, New Extension",
			CollectionMapURL:        "https://www.google.com/maps/search/?api=1&query=16+Biana+street+New+Extension+Piwoyi+Abuja",
			TotalPacks:              1,
			ShareSize:               "5kg",
			MaxMembers:              10,
			CurrentMembersCount:     8,
			CurrentSharesCount:      8,
			PricePerShareQuotedKobo: 875000, // ₦8,750
			BufferPercent:           4.0,
			Status:                  "OPEN",
			PaymentDeadline:         now.Add(20 * time.Hour),
			SharingDate:             now.Add(3 * 24 * time.Hour),
			CreatedAt:               now.Add(-2 * 24 * time.Hour),
			UpdatedAt:               now.Add(-40 * time.Minute),
		},
		{
			ID:                      "unit-piwoyi-milk-02",
			ProductID:               "prod-lactorich-milk-25kg",
			ProductName:             "Lactorich Instant Full Cream Powdered Milk",
			ProductCategory:         "Dairy",
			ProductImageURL:         "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80",
			ProductPackSize:         "25kg Bag",
			UnitOfShare:             "2.5kg Share",
			ManagerID:               "user-mgr-fatima",
			ManagerName:             "Fatima Mohammed",
			ManagerPhone:            "+2348044445555",
			ManagerRating:           4.80,
			AreaID:                  "area-piwoyi-abuja",
			AreaName:                "Piwoyi District Hub",
			AreaLocality:            "Piwoyi",
			AreaCity:                "Abuja",
			AreaState:               "FCT",
			AreaCountry:             "Nigeria",
			HubID:                   "hub-piwoyi-salam",
			CollectionAddress:       "Behind Salam Salam, Piwoyi, Abuja",
			CollectionLandmark:      "Behind Salam Salam",
			CollectionMapURL:        "https://www.google.com/maps/search/?api=1&query=Behind+Salam+Salam+Piwoyi+Abuja",
			TotalPacks:              1,
			ShareSize:               "2.5kg",
			MaxMembers:              10,
			CurrentMembersCount:     5,
			CurrentSharesCount:      5,
			PricePerShareQuotedKobo: 920000, // ₦9,200
			BufferPercent:           4.0,
			Status:                  "OPEN",
			PaymentDeadline:         now.Add(32 * time.Hour),
			SharingDate:             now.Add(4 * 24 * time.Hour),
			CreatedAt:               now.Add(-1 * 24 * time.Hour),
			UpdatedAt:               now.Add(-2 * time.Hour),
		},
		{
			ID:                      "unit-piwoyi-crayfish-03",
			ProductID:               "prod-crayfish-bag",
			ProductName:             "Oron Premium Dried Crayfish",
			ProductCategory:         "Seafood & Seasonings",
			ProductImageURL:         "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80",
			ProductPackSize:         "Large Sack (Bag)",
			UnitOfShare:             "Paint Bucket Share (~2kg)",
			ManagerID:               "user-mgr-ibrahim",
			ManagerName:             "Ibrahim Danladi",
			ManagerPhone:            "+2348022223333",
			ManagerRating:           4.88,
			AreaID:                  "area-piwoyi-abuja",
			AreaName:                "Piwoyi District Hub",
			AreaLocality:            "Piwoyi",
			AreaCity:                "Abuja",
			AreaState:               "FCT",
			AreaCountry:             "Nigeria",
			HubID:                   "hub-piwoyi-sarah",
			CollectionAddress:       "Behind Sarah Dominion School, Piwoyi, Abuja",
			CollectionLandmark:      "Behind Sarah Dominion School",
			CollectionMapURL:        "https://www.google.com/maps/search/?api=1&query=Behind+Sarah+Dominion+School+Piwoyi+Abuja",
			TotalPacks:              1,
			ShareSize:               "Paint Bucket (~2kg)",
			MaxMembers:              8,
			CurrentMembersCount:     7,
			CurrentSharesCount:      7,
			PricePerShareQuotedKobo: 750000, // ₦7,500
			BufferPercent:           4.0,
			Status:                  "OPEN",
			PaymentDeadline:         now.Add(14 * time.Hour),
			SharingDate:             now.Add(2 * 24 * time.Hour),
			CreatedAt:               now.Add(-2 * 24 * time.Hour),
			UpdatedAt:               now.Add(-15 * time.Minute),
		},
		{
			ID:                      "unit-piwoyi-palmoil-04",
			ProductID:               "prod-palm-oil-25l",
			ProductName:             "Direct Mill Pure Red Palm Oil",
			ProductCategory:         "Oils",
			ProductImageURL:         "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
			ProductPackSize:         "25L Gallon",
			UnitOfShare:             "5L Share",
			ManagerID:               "user-mgr-chidinma",
			ManagerName:             "Chidinma Eze",
			ManagerPhone:            "+2348033334444",
			ManagerRating:           4.92,
			AreaID:                  "area-piwoyi-abuja",
			AreaName:                "Piwoyi District Hub",
			AreaLocality:            "Piwoyi",
			AreaCity:                "Abuja",
			AreaState:               "FCT",
			AreaCountry:             "Nigeria",
			HubID:                   "hub-piwoyi-bakery",
			CollectionAddress:       "By Bakery, Piwoyi, Abuja",
			CollectionLandmark:      "By Bakery, Piwoyi Main Road",
			CollectionMapURL:        "https://www.google.com/maps/search/?api=1&query=By+Bakery+Piwoyi+Abuja",
			TotalPacks:              1,
			ShareSize:               "5L",
			MaxMembers:              5,
			CurrentMembersCount:     4,
			CurrentSharesCount:      4,
			PricePerShareQuotedKobo: 840000, // ₦8,400
			BufferPercent:           4.0,
			Status:                  "OPEN",
			PaymentDeadline:         now.Add(18 * time.Hour),
			SharingDate:             now.Add(3 * 24 * time.Hour),
			CreatedAt:               now.Add(-18 * time.Hour),
			UpdatedAt:               now.Add(-45 * time.Minute),
		},
		{
			ID:                      "unit-lugbe-rice-05",
			ProductID:               "prod-rice-mama-gold-50kg",
			ProductName:             "Mama Gold Premium Long Grain Parboiled Rice",
			ProductCategory:         "Grains",
			ProductImageURL:         "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
			ProductPackSize:         "50kg Bag",
			UnitOfShare:             "5kg Share",
			ManagerID:               "user-mgr-aisha",
			ManagerName:             "Aisha Bello",
			ManagerPhone:            "+2348011112222",
			ManagerRating:           4.95,
			AreaID:                  "area-lugbe-abuja",
			AreaName:                "Lugbe Airport Road Hub",
			AreaLocality:            "Lugbe",
			AreaCity:                "Abuja",
			AreaState:               "FCT",
			AreaCountry:             "Nigeria",
			HubID:                   "hub-lugbe-fha",
			CollectionAddress:       "FHA Estate Phase 1, Airport Road, Lugbe, Abuja",
			CollectionLandmark:      "Opposite FHA Police Signboard, Lugbe",
			CollectionMapURL:        "https://www.google.com/maps/search/?api=1&query=FHA+Estate+Lugbe+Abuja",
			TotalPacks:              1,
			ShareSize:               "5kg",
			MaxMembers:              10,
			CurrentMembersCount:     6,
			CurrentSharesCount:      6,
			PricePerShareQuotedKobo: 875000, // ₦8,750
			BufferPercent:           4.0,
			Status:                  "OPEN",
			PaymentDeadline:         now.Add(36 * time.Hour),
			SharingDate:             now.Add(4 * 24 * time.Hour),
			CreatedAt:               now.Add(-12 * time.Hour),
			UpdatedAt:               now.Add(-25 * time.Minute),
		},
	}

	return units
}

func getMockMembers() map[string][]domain.UnitMember {
	now := time.Now()
	code1 := "840192"
	code2 := "384912"
	code3 := "719401"
	code4 := "192847"

	return map[string][]domain.UnitMember{
		"unit-piwoyi-rice-01": {
			{
				ID:               "um-101",
				UnitID:           "unit-piwoyi-rice-01",
				UserID:           "mem-01",
				UserName:         "Babagana Kyari",
				UserPhone:        "+2348100000001",
				SharesCount:      1,
				AmountPaidKobo:   875000,
				PaymentStatus:    "PAID",
				CollectionStatus: "PENDING",
				CollectionCode:   code2,
				JoinedAt:         now.Add(-30 * time.Hour),
			},
			{
				ID:               "um-102",
				UnitID:           "unit-piwoyi-rice-01",
				UserID:           "mem-02",
				UserName:         "Zainab Bukar",
				UserPhone:        "+2348100000002",
				SharesCount:      1,
				AmountPaidKobo:   875000,
				PaymentStatus:    "PAID",
				CollectionStatus: "PENDING",
				CollectionCode:   code3,
				JoinedAt:         now.Add(-28 * time.Hour),
			},
			{
				ID:               "um-103",
				UnitID:           "unit-piwoyi-rice-01",
				UserID:           "mem-03",
				UserName:         "Musa Usman",
				UserPhone:        "+2348100000003",
				SharesCount:      1,
				AmountPaidKobo:   875000,
				PaymentStatus:    "PAID",
				CollectionStatus: "PENDING",
				CollectionCode:   code4,
				JoinedAt:         now.Add(-20 * time.Hour),
			},
		},
		"unit-piwoyi-crayfish-03": {
			{
				ID:               "um-301",
				UnitID:           "unit-piwoyi-crayfish-03",
				UserID:           "mem-01",
				UserName:         "Babagana Kyari",
				UserPhone:        "+2348100000001",
				SharesCount:      1,
				AmountPaidKobo:   750000,
				PaymentStatus:    "PAID",
				CollectionStatus: "PENDING",
				CollectionCode:   code1,
				JoinedAt:         now.Add(-24 * time.Hour),
			},
		},
	}
}

func getMockUsers() map[string]*domain.User {
	adminEmail := "admin@sharedbuy.ng"
	adminSubrole := "SUPER_ADMIN"
	areaPiwoyi := "area-piwoyi-abuja"
	hash, _ := bcrypt.GenerateFromPassword([]byte("Admin@123456"), bcrypt.DefaultCost)
	hashStr := string(hash)

	aishaEmail := "aisha.bello@gmail.com"
	fatimaEmail := "fatima.m@gmail.com"
	ibrahimEmail := "ibrahim.d@yahoo.com"
	chidinmaEmail := "chidinma.eze@gmail.com"
	dahiruEmail := "distributor@northernagro.ng"

	mem1Email := "babagana@gmail.com"

	users := map[string]*domain.User{
		"user-dist-dahiru": {
			ID:        "user-dist-dahiru",
			FullName:  "Alhaji Dahiru (Northern Agro Millers & Grain Depot)",
			Phone:     "+2348055556666",
			Email:     &dahiruEmail,
			Role:      domain.RoleDistributor,
			AreaID:    &areaPiwoyi,
			Status:    "ACTIVE",
			Rating:    4.94,
			CreatedAt: time.Now().Add(-60 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
		"user-admin-01": {
			ID:           "user-admin-01",
			FullName:     "SharedBuy Operations Admin",
			Phone:        "+2348000000001",
			Email:        &adminEmail,
			PasswordHash: &hashStr,
			Role:         domain.RoleAdmin,
			AdminSubrole: &adminSubrole,
			AreaID:       &areaPiwoyi,
			Status:       "ACTIVE",
			Rating:       5.0,
			CreatedAt:    time.Now().Add(-60 * 24 * time.Hour),
			UpdatedAt:    time.Now(),
		},
		"user-mgr-aisha": {
			ID:        "user-mgr-aisha",
			FullName:  "Aisha Bello",
			Phone:     "+2348011112222",
			Email:     &aishaEmail,
			Role:      domain.RoleUnitManager,
			AreaID:    &areaPiwoyi,
			Status:    "ACTIVE",
			Rating:    4.95,
			CreatedAt: time.Now().Add(-60 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
		"user-mgr-fatima": {
			ID:        "user-mgr-fatima",
			FullName:  "Fatima Mohammed",
			Phone:     "+2348044445555",
			Email:     &fatimaEmail,
			Role:      domain.RoleUnitManager,
			AreaID:    &areaPiwoyi,
			Status:    "ACTIVE",
			Rating:    4.80,
			CreatedAt: time.Now().Add(-60 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
		"user-mgr-ibrahim": {
			ID:        "user-mgr-ibrahim",
			FullName:  "Ibrahim Danladi",
			Phone:     "+2348022223333",
			Email:     &ibrahimEmail,
			Role:      domain.RoleUnitManager,
			AreaID:    &areaPiwoyi,
			Status:    "ACTIVE",
			Rating:    4.88,
			CreatedAt: time.Now().Add(-60 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
		"user-mgr-chidinma": {
			ID:        "user-mgr-chidinma",
			FullName:  "Chidinma Eze",
			Phone:     "+2348033334444",
			Email:     &chidinmaEmail,
			Role:      domain.RoleUnitManager,
			AreaID:    &areaPiwoyi,
			Status:    "ACTIVE",
			Rating:    4.92,
			CreatedAt: time.Now().Add(-60 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
		"mem-01": {
			ID:                   "mem-01",
			FullName:             "Babagana Kyari",
			Phone:                "+2348100000001",
			Email:                &mem1Email,
			Role:                 domain.RoleMember,
			AreaID:               &areaPiwoyi,
			Status:               "ACTIVE",
			Rating:               5.0,
			WalletBalanceKobo:    1250000, // ₦12,500 initial demo balance
			ReferralCode:         "REF-BABAGANA",
			ReferralEarningsKobo: 40000,   // ₦400 (2 neighbors x ₦200)
			ReferralsCount:       2,
			CreatedAt:            time.Now().Add(-30 * 24 * time.Hour),
			UpdatedAt:            time.Now(),
		},
	}

	return users
}

func matchesFilter(u domain.Unit, f UnitFilter) bool {
	if f.AreaID != "" && u.AreaID != f.AreaID {
		return false
	}
	if f.Locality != "" && !strings.EqualFold(u.AreaLocality, f.Locality) {
		return false
	}
	if f.State != "" && !strings.EqualFold(u.AreaState, f.State) {
		return false
	}
	if f.Country != "" && !strings.EqualFold(u.AreaCountry, f.Country) {
		return false
	}
	if f.ProductID != "" && u.ProductID != f.ProductID {
		return false
	}
	if f.Status != "" && !strings.EqualFold(u.Status, f.Status) {
		return false
	}
	return true
}
