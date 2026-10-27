package repository

import (
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"sharedbuy-backend/internal/domain"
)

var defaultAreas = []domain.Area{
	{
		ID:        "area-maiduguri",
		Name:      "Customs & Post Office Hub",
		City:      "Maiduguri",
		State:     "Borno",
		IsActive:  true,
		CreatedAt: time.Now().Add(-30 * 24 * time.Hour),
	},
	{
		ID:        "area-kano",
		Name:      "Fagge & Sabon Gari",
		City:      "Kano",
		State:     "Kano",
		IsActive:  true,
		CreatedAt: time.Now().Add(-30 * 24 * time.Hour),
	},
	{
		ID:        "area-lagos",
		Name:      "Ikeja & Maryland Estate",
		City:      "Ikeja",
		State:     "Lagos",
		IsActive:  true,
		CreatedAt: time.Now().Add(-30 * 24 * time.Hour),
	},
	{
		ID:        "area-abuja",
		Name:      "Gwarinpa & Wuse II Hub",
		City:      "Abuja",
		State:     "FCT",
		IsActive:  true,
		CreatedAt: time.Now().Add(-30 * 24 * time.Hour),
	},
}

var defaultProducts = []domain.Product{
	{
		ID:            "prod-rice-50kg",
		Name:          "Premium Long Grain Parboiled Rice",
		Category:      "Grains",
		ImageURL:      "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
		Description:   "Stone-free, polished Nigerian parboiled rice in standard bulk 50kg bag.",
		PackSize:      "50kg Bag",
		UnitOfShare:   "5kg Share",
		SharesPerPack: 10,
		IsActive:      true,
		CreatedAt:     time.Now().Add(-30 * 24 * time.Hour),
	},
	{
		ID:            "prod-beans-50kg",
		Name:          "Honey Beans (Oloyin)",
		Category:      "Legumes",
		ImageURL:      "https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=600&q=80",
		Description:   "Sweet high-yield Nigerian honey beans, clean and insect-free.",
		PackSize:      "50kg Bag",
		UnitOfShare:   "5kg Share",
		SharesPerPack: 10,
		IsActive:      true,
		CreatedAt:     time.Now().Add(-30 * 24 * time.Hour),
	},
	{
		ID:            "prod-oil-25l",
		Name:          "King’s Pure Vegetable Cooking Oil",
		Category:      "Oils",
		ImageURL:      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
		Description:   "Cholesterol-free, vitamin A fortified pure vegetable cooking oil in 25L jerrycan.",
		PackSize:      "25L Jerrycan",
		UnitOfShare:   "5L Share",
		SharesPerPack: 5,
		IsActive:      true,
		CreatedAt:     time.Now().Add(-30 * 24 * time.Hour),
	},
	{
		ID:            "prod-garri-50kg",
		Name:          "Ijebu White Garri",
		Category:      "Tubers",
		ImageURL:      "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80",
		Description:   "Crispy, dry and properly fermented premium Ijebu garri.",
		PackSize:      "50kg Bag",
		UnitOfShare:   "5kg Share",
		SharesPerPack: 10,
		IsActive:      true,
		CreatedAt:     time.Now().Add(-30 * 24 * time.Hour),
	},
	{
		ID:            "prod-sugar-50kg",
		Name:          "Golden Penny Refined Pure Sugar",
		Category:      "Condiments",
		ImageURL:      "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?auto=format&fit=crop&w=600&q=80",
		Description:   "Clean granulated fortified white sugar directly from industrial millers.",
		PackSize:      "50kg Bag",
		UnitOfShare:   "5kg Share",
		SharesPerPack: 10,
		IsActive:      true,
		CreatedAt:     time.Now().Add(-30 * 24 * time.Hour),
	},
	{
		ID:            "prod-milk-carton",
		Name:          "Peak Full Cream Evaporated Milk",
		Category:      "Dairy",
		ImageURL:      "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80",
		Description:   "Full cream rich evaporated milk in standard carton containing 48 tins.",
		PackSize:      "Carton of 48",
		UnitOfShare:   "6 Tins Share",
		SharesPerPack: 8,
		IsActive:      true,
		CreatedAt:     time.Now().Add(-30 * 24 * time.Hour),
	},
}

func getMockUnits() []domain.Unit {
	now := time.Now()
	units := []domain.Unit{
		{
			ID:                      "unit-rice-maiduguri-01",
			ProductID:               "prod-rice-50kg",
			ProductName:             "Premium Long Grain Parboiled Rice",
			ProductCategory:         "Grains",
			ProductImageURL:         "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
			ProductPackSize:         "50kg Bag",
			UnitOfShare:             "5kg Share",
			ManagerID:               "user-mgr-aisha",
			ManagerName:             "Aisha Bello",
			ManagerPhone:            "+2348011112222",
			ManagerRating:           4.95,
			AreaID:                  "area-maiduguri",
			AreaName:                "Customs & Post Office Hub",
			AreaCity:                "Maiduguri",
			AreaState:               "Borno",
			CollectionAddress:       "Shop 14, Opposite Post Office Roundabout, Maiduguri",
			CollectionLandmark:      "Post Office Roundabout",
			TotalPacks:              1,
			ShareSize:               "5kg",
			MaxMembers:              10,
			CurrentMembersCount:     9,
			CurrentSharesCount:      9,
			PricePerShareQuotedKobo: 982500, // ₦9,825
			BufferPercent:           4.0,
			Status:                  "OPEN",
			PaymentDeadline:         now.Add(18 * time.Hour),
			SharingDate:             now.Add(3 * 24 * time.Hour),
			CreatedAt:               now.Add(-2 * 24 * time.Hour),
			UpdatedAt:               now.Add(-1 * time.Hour),
		},
		{
			ID:                      "unit-beans-maiduguri-01",
			ProductID:               "prod-beans-50kg",
			ProductName:             "Honey Beans (Oloyin)",
			ProductCategory:         "Legumes",
			ProductImageURL:         "https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=600&q=80",
			ProductPackSize:         "50kg Bag",
			UnitOfShare:             "5kg Share",
			ManagerID:               "user-mgr-fatima",
			ManagerName:             "Fatima Mohammed",
			ManagerPhone:            "+2348044445555",
			ManagerRating:           4.80,
			AreaID:                  "area-maiduguri",
			AreaName:                "Customs & Post Office Hub",
			AreaCity:                "Maiduguri",
			AreaState:               "Borno",
			CollectionAddress:       "No. 3 Airport Road, Bulumkutu, Maiduguri",
			CollectionLandmark:      "Behind Federal High Court",
			TotalPacks:              1,
			ShareSize:               "5kg",
			MaxMembers:              10,
			CurrentMembersCount:     4,
			CurrentSharesCount:      4,
			PricePerShareQuotedKobo: 895000, // ₦8,950
			BufferPercent:           4.0,
			Status:                  "OPEN",
			PaymentDeadline:         now.Add(36 * time.Hour),
			SharingDate:             now.Add(4 * 24 * time.Hour),
			CreatedAt:               now.Add(-1 * 24 * time.Hour),
			UpdatedAt:               now.Add(-3 * time.Hour),
		},
		{
			ID:                      "unit-oil-lagos-01",
			ProductID:               "prod-oil-25l",
			ProductName:             "King’s Pure Vegetable Cooking Oil",
			ProductCategory:         "Oils",
			ProductImageURL:         "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80",
			ProductPackSize:         "25L Jerrycan",
			UnitOfShare:             "5L Share",
			ManagerID:               "user-mgr-olumide",
			ManagerName:             "Olumide Bakare",
			ManagerPhone:            "+2348055556666",
			ManagerRating:           4.75,
			AreaID:                  "area-lagos",
			AreaName:                "Ikeja & Maryland Estate",
			AreaCity:                "Ikeja",
			AreaState:               "Lagos",
			CollectionAddress:       "12 Allen Avenue (Beside Alade Market), Ikeja",
			CollectionLandmark:      "Alade Market Entrance",
			TotalPacks:              1,
			ShareSize:               "5L",
			MaxMembers:              5,
			CurrentMembersCount:     4,
			CurrentSharesCount:      4,
			PricePerShareQuotedKobo: 1140000, // ₦11,400
			BufferPercent:           4.0,
			Status:                  "OPEN",
			PaymentDeadline:         now.Add(12 * time.Hour),
			SharingDate:             now.Add(2 * 24 * time.Hour),
			CreatedAt:               now.Add(-2 * 24 * time.Hour),
			UpdatedAt:               now.Add(-30 * time.Minute),
		},
		{
			ID:                      "unit-rice-kano-01",
			ProductID:               "prod-rice-50kg",
			ProductName:             "Premium Long Grain Parboiled Rice",
			ProductCategory:         "Grains",
			ProductImageURL:         "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
			ProductPackSize:         "50kg Bag",
			UnitOfShare:             "5kg Share",
			ManagerID:               "user-mgr-ibrahim",
			ManagerName:             "Ibrahim Danladi",
			ManagerPhone:            "+2348022223333",
			ManagerRating:           4.88,
			AreaID:                  "area-kano",
			AreaName:                "Fagge & Sabon Gari",
			AreaCity:                "Kano",
			AreaState:               "Kano",
			CollectionAddress:       "Shop 8, IBB Way, Kofar Ruwa Market Area, Kano",
			CollectionLandmark:      "Near Total Filling Station",
			TotalPacks:              1,
			ShareSize:               "5kg",
			MaxMembers:              10,
			CurrentMembersCount:     10,
			CurrentSharesCount:      10,
			PricePerShareQuotedKobo: 950000, // ₦9,500
			BufferPercent:           4.0,
			Status:                  "ORDERED",
			PaymentDeadline:         now.Add(-6 * time.Hour),
			SharingDate:             now.Add(2 * 24 * time.Hour),
			CreatedAt:               now.Add(-3 * 24 * time.Hour),
			UpdatedAt:               now.Add(-2 * time.Hour),
		},
		{
			ID:                      "unit-rice-maiduguri-02",
			ProductID:               "prod-rice-50kg",
			ProductName:             "Premium Long Grain Parboiled Rice",
			ProductCategory:         "Grains",
			ProductImageURL:         "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80",
			ProductPackSize:         "50kg Bag",
			UnitOfShare:             "5kg Share",
			ManagerID:               "user-mgr-fatima",
			ManagerName:             "Fatima Mohammed",
			ManagerPhone:            "+2348044445555",
			ManagerRating:           4.80,
			AreaID:                  "area-maiduguri",
			AreaName:                "Customs & Post Office Hub",
			AreaCity:                "Maiduguri",
			AreaState:               "Borno",
			CollectionAddress:       "No. 3 Airport Road, Bulumkutu, Maiduguri",
			CollectionLandmark:      "Behind Federal High Court",
			TotalPacks:              1,
			ShareSize:               "5kg",
			MaxMembers:              10,
			CurrentMembersCount:     10,
			CurrentSharesCount:      10,
			PricePerShareQuotedKobo: 982500,
			BufferPercent:           4.0,
			Status:                  "READY_FOR_COLLECTION",
			PaymentDeadline:         now.Add(-48 * time.Hour),
			SharingDate:             now.Add(2 * time.Hour),
			CreatedAt:               now.Add(-5 * 24 * time.Hour),
			UpdatedAt:               now.Add(-10 * time.Minute),
		},
		{
			ID:                      "unit-garri-lagos-01",
			ProductID:               "prod-garri-50kg",
			ProductName:             "Ijebu White Garri",
			ProductCategory:         "Tubers",
			ProductImageURL:         "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80",
			ProductPackSize:         "50kg Bag",
			UnitOfShare:             "5kg Share",
			ManagerID:               "user-mgr-chidinma",
			ManagerName:             "Chidinma Eze",
			ManagerPhone:            "+2348033334444",
			ManagerRating:           4.92,
			AreaID:                  "area-lagos",
			AreaName:                "Ikeja & Maryland Estate",
			AreaCity:                "Ikeja",
			AreaState:               "Lagos",
			CollectionAddress:       "Block 4, Maryland Commercial Complex, Lagos",
			CollectionLandmark:      "Maryland Bus Stop",
			TotalPacks:              1,
			ShareSize:               "5kg",
			MaxMembers:              10,
			CurrentMembersCount:     3,
			CurrentSharesCount:      3,
			PricePerShareQuotedKobo: 495000, // ₦4,950
			BufferPercent:           4.0,
			Status:                  "OPEN",
			PaymentDeadline:         now.Add(40 * time.Hour),
			SharingDate:             now.Add(5 * 24 * time.Hour),
			CreatedAt:               now.Add(-12 * time.Hour),
			UpdatedAt:               now.Add(-1 * time.Hour),
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
		"unit-rice-maiduguri-01": {
			{
				ID:               "um-101",
				UnitID:           "unit-rice-maiduguri-01",
				UserID:           "mem-01",
				UserName:         "Babagana Kyari",
				UserPhone:        "+2348100000001",
				SharesCount:      1,
				AmountPaidKobo:   982500,
				PaymentStatus:    "PAID",
				CollectionStatus: "PENDING",
				CollectionCode:   code2,
				JoinedAt:         now.Add(-30 * time.Hour),
			},
			{
				ID:               "um-102",
				UnitID:           "unit-rice-maiduguri-01",
				UserID:           "mem-02",
				UserName:         "Zainab Bukar",
				UserPhone:        "+2348100000002",
				SharesCount:      1,
				AmountPaidKobo:   982500,
				PaymentStatus:    "PAID",
				CollectionStatus: "PENDING",
				CollectionCode:   code3,
				JoinedAt:         now.Add(-28 * time.Hour),
			},
			{
				ID:               "um-103",
				UnitID:           "unit-rice-maiduguri-01",
				UserID:           "mem-03",
				UserName:         "Musa Usman",
				UserPhone:        "+2348100000003",
				SharesCount:      1,
				AmountPaidKobo:   982500,
				PaymentStatus:    "PAID",
				CollectionStatus: "PENDING",
				CollectionCode:   code4,
				JoinedAt:         now.Add(-20 * time.Hour),
			},
		},
		"unit-rice-maiduguri-02": {
			{
				ID:               "um-201",
				UnitID:           "unit-rice-maiduguri-02",
				UserID:           "mem-01",
				UserName:         "Babagana Kyari",
				UserPhone:        "+2348100000001",
				SharesCount:      1,
				AmountPaidKobo:   982500,
				PaymentStatus:    "PAID",
				CollectionStatus: "PENDING",
				CollectionCode:   code1,
				JoinedAt:         now.Add(-4 * 24 * time.Hour),
			},
		},
	}
}

func getMockUsers() map[string]*domain.User {
	adminEmail := "admin@sharedbuy.ng"
	adminSubrole := "SUPER_ADMIN"
	adminArea := "area-lagos"
	hash, _ := bcrypt.GenerateFromPassword([]byte("Admin@123456"), bcrypt.DefaultCost)
	hashStr := string(hash)

	aishaEmail := "aisha.bello@gmail.com"
	aishaArea := "area-maiduguri"
	fatimaEmail := "fatima.m@gmail.com"
	fatimaArea := "area-maiduguri"
	ibrahimEmail := "ibrahim.d@yahoo.com"
	ibrahimArea := "area-kano"
	chidinmaEmail := "chidinma.eze@gmail.com"
	chidinmaArea := "area-lagos"

	mem1Email := "babagana@gmail.com"
	mem1Area := "area-maiduguri"

	users := map[string]*domain.User{
		"user-admin-01": {
			ID:           "user-admin-01",
			FullName:     "SharedBuy Operations Admin",
			Phone:        "+2348000000001",
			Email:        &adminEmail,
			PasswordHash: &hashStr,
			Role:         domain.RoleAdmin,
			AdminSubrole: &adminSubrole,
			AreaID:       &adminArea,
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
			AreaID:    &aishaArea,
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
			AreaID:    &fatimaArea,
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
			AreaID:    &ibrahimArea,
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
			AreaID:    &chidinmaArea,
			Status:    "ACTIVE",
			Rating:    4.92,
			CreatedAt: time.Now().Add(-60 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
		"mem-01": {
			ID:        "mem-01",
			FullName:  "Babagana Kyari",
			Phone:     "+2348100000001",
			Email:     &mem1Email,
			Role:      domain.RoleMember,
			AreaID:    &mem1Area,
			Status:    "ACTIVE",
			Rating:    5.0,
			CreatedAt: time.Now().Add(-30 * 24 * time.Hour),
			UpdatedAt: time.Now(),
		},
	}

	return users
}

func matchesFilter(u domain.Unit, f UnitFilter) bool {
	if f.AreaID != "" && u.AreaID != f.AreaID {
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
