-- CREATE DATABASE test_db;
USE test_db;
DROP TABLE IF EXISTS MissionInvoice;
DROP TABLE IF EXISTS Invoice;
DROP TABLE IF EXISTS Mission;
DROP TABLE IF EXISTS Reservation;
DROP TABLE IF EXISTS Truck;
DROP TABLE IF EXISTS TruckType;
DROP TABLE IF EXISTS Driver;
DROP TABLE IF EXISTS Customer;

-- ============================================================
-- TABLES CREATION
-- ============================================================
 
-- Customer 
CREATE TABLE Customer (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_type ENUM('Individual','Business') NOT NULL,
    business_name VARCHAR(100) NULL,
    first_name VARCHAR(50)  NULL,
    last_name VARCHAR(50)  NULL,
    address VARCHAR(200) NOT NULL,
    contact VARCHAR(20)  NOT NULL UNIQUE,
    CONSTRAINT check_customer_type CHECK(
        (customer_type = 'Business' AND business_name IS NOT NULL) OR
        (customer_type = 'Individual' AND first_name IS NOT NULL AND last_name IS NOT NULL)
    ),
    CONSTRAINT uq_customer UNIQUE (first_name, last_name, address)
);
 
-- Driver 
CREATE TABLE Driver (
    driver_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    license_type ENUM('Tourism','Heavyweight','Super Heavyweight') NOT NULL,
    contact_driver VARCHAR(20) NOT NULL UNIQUE
);
 
-- TruckType 
CREATE TABLE TruckType (
    truck_type ENUM('Tourism','Heavyweight','Super Heavyweight') PRIMARY KEY,
    rate_per_hour DECIMAL(10,2) NOT NULL,
    rate_per_km DECIMAL(10,2) NOT NULL,
    CONSTRAINT chk_rate_hour CHECK (rate_per_hour > 0),
    CONSTRAINT chk_rate_km CHECK (rate_per_km   > 0)
);
 
-- Truck 
CREATE TABLE Truck (
    truck_id INT AUTO_INCREMENT PRIMARY KEY,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    truck_type ENUM('Tourism','Heavyweight','Super Heavyweight') NOT NULL,
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    FOREIGN KEY (truck_type) REFERENCES TruckType(truck_type) ON DELETE RESTRICT 
);
 
-- Reservation 
CREATE TABLE Reservation (
    reservation_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    reservation_date DATE NOT NULL,
    status ENUM('Active','Cancelled') NOT NULL DEFAULT 'Active',
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) ON DELETE RESTRICT 
);
 
-- Mission
CREATE TABLE Mission (
    mission_id  INT AUTO_INCREMENT PRIMARY KEY,
    reservation_id INT NOT NULL,
    truck_id  INT NOT NULL,
    driver_id INT NOT NULL,
    rendezvous_place VARCHAR(200) NOT NULL,
    req_truck_type ENUM('Tourism','Heavyweight','Super Heavyweight') NOT NULL,
    planned_start DATETIME NOT NULL,
    planned_end DATETIME NOT NULL,
    actual_start DATETIME NULL,
    actual_end DATETIME NULL,
    odometer_before INT NULL,
    odometer_after INT NULL,
    status ENUM('Scheduled','Ongoing','Completed','Cancelled') NOT NULL DEFAULT 'Scheduled',
    FOREIGN KEY (reservation_id) REFERENCES Reservation(reservation_id) ON DELETE RESTRICT,
    FOREIGN KEY (truck_id) REFERENCES Truck(truck_id) ON DELETE RESTRICT,
    FOREIGN KEY (driver_id) REFERENCES Driver(driver_id) ON DELETE RESTRICT,
    CONSTRAINT chk_planned_dates CHECK (planned_end > planned_start),
    CONSTRAINT chk_actual_dates CHECK (actual_end IS NULL OR actual_end > actual_start),
    CONSTRAINT chk_odometer_before CHECK (odometer_before IS NULL OR odometer_before >= 0),
    CONSTRAINT chk_odometer_after CHECK (odometer_after  IS NULL OR odometer_after  >= odometer_before)
);
 
-- Invoice 
CREATE TABLE Invoice (
    invoice_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id  INT NOT NULL,
    invoice_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('Unpaid','Paid') NOT NULL DEFAULT 'Unpaid',
    payment_method ENUM('Credit Card','Cash','Check') NULL,
    payment_date DATE NULL,
    CONSTRAINT chk_total_amount CHECK (total_amount >= 0),
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id) ON DELETE RESTRICT
);
 
-- MissionInvoice
CREATE TABLE MissionInvoice (
    invoice_id INT NOT NULL,
    mission_id INT  NOT NULL,
    duration_hours DECIMAL(6,2)  NOT NULL,
    km_traveled INT NOT NULL,
    duration_cost DECIMAL(10,2) NOT NULL,
    km_cost DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (invoice_id, mission_id),
    FOREIGN KEY (invoice_id) REFERENCES Invoice(invoice_id) ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES Mission(mission_id) ON DELETE RESTRICT,
    CONSTRAINT chk_duration_hours CHECK (duration_hours > 0),
    CONSTRAINT chk_km_traveled CHECK (km_traveled >= 0),
    CONSTRAINT chk_duration_cost CHECK (duration_cost >= 0),
    CONSTRAINT chk_km_cost CHECK (km_cost >= 0),
    CONSTRAINT chk_line_total CHECK (line_total >= 0)
);
 
-- ============================================================
-- INSERTING DATA
-- ============================================================
 
-- Customer (10 rows)
INSERT INTO Customer (customer_type, business_name, first_name, last_name, address, contact) VALUES
('Business',   'Bombardier Inc.',        NULL,      NULL,       '800 Rene-Levesque Blvd W, Montreal', '514-861-9481'),
('Business',   'Couche-Tard Corp.',       NULL,      NULL,       '4204 Industriel Blvd, Laval',        '450-662-3272'),
('Business',   'Metro Richelieu Inc.',    NULL,      NULL,       '11011 Maurice-Duplessis, Montreal',   '514-643-1000'),
('Business',   'SNC-Lavalin Group',       NULL,      NULL,       '455 Rene-Levesque W, Montreal',       '514-393-1000'),
('Business',   'Bell Canada Enterprises', NULL,      NULL,       '1 Carrefour Alexander-Graham, Mont',  '514-870-1111'),
('Individual', NULL, 'Jean',     'Tremblay', '123 Rue Sainte-Catherine, Montreal', '514-555-0101'),
('Individual', NULL, 'Marie',    'Gagnon',   '456 Avenue du Parc, Montreal',       '514-555-0202'),
('Individual', NULL, 'Pierre',   'Lavoie',   '789 Boulevard Saint-Laurent, MTL',   '514-555-0303'),
('Individual', NULL, 'Sophie',   'Bouchard', '321 Rue Ontario Est, Montreal',      '514-555-0404'),
('Individual', NULL, 'Francois', 'Cote',     '654 Avenue Laurier, Montreal',       '514-555-0505');
 
-- Driver (10 rows)
INSERT INTO Driver (first_name, last_name, license_type, contact_driver) VALUES
('Robert',   'Leblanc',  'Super Heavyweight', '514-600-1001'),
('Alain',    'Morin',    'Heavyweight',        '514-600-1002'),
('Claude',   'Fortin',   'Tourism',            '514-600-1003'),
('Daniel',   'Girard',   'Super Heavyweight',  '514-600-1004'),
('Eric',     'Pelletier','Heavyweight',         '514-600-1005'),
('Francine', 'Gauthier', 'Tourism',            '514-600-1006'),
('Guy',      'Bergeron', 'Heavyweight',         '514-600-1007'),
('Helene',   'Ouellet',  'Super Heavyweight',  '514-600-1008'),
('Ivan',     'Roy',      'Tourism',            '514-600-1009'),
('Julie',    'Caron',    'Heavyweight',         '514-600-1010');
 
-- TruckType (3 rows)
INSERT INTO TruckType (truck_type, rate_per_hour, rate_per_km) VALUES
('Tourism',           30.00, 1.25),
('Heavyweight',       45.00, 1.35),
('Super Heavyweight', 80.00, 1.55);
 
-- Truck (10 rows)
INSERT INTO Truck (brand, model, truck_type, license_plate) VALUES
('GMC',          'Savana Cargo',  'Tourism',           'MTL-1001'),
('Ford',         'Transit 350',   'Tourism',           'MTL-1002'),
('Mercedes',     'Sprinter 2500', 'Tourism',           'MTL-1003'),
('GMC',          'Sierra 3500',   'Heavyweight',       'MTL-1004'),
('Ford',         'F-750',         'Heavyweight',       'MTL-1005'),
('Isuzu',        'NPR-HD',        'Heavyweight',       'MTL-1006'),
('Mack',         'Anthem',        'Super Heavyweight', 'MTL-1007'),
('Freightliner', 'Cascadia',      'Super Heavyweight', 'MTL-1008'),
('Kenworth',     'T680',          'Super Heavyweight', 'MTL-1009'),
('Volvo',        'VNL 860',       'Super Heavyweight', 'MTL-1010');
 
-- Reservation (10 rows)
INSERT INTO Reservation (customer_id, reservation_date, status) VALUES
(1,  '2026-01-05', 'Active'),
(2,  '2026-01-10', 'Active'),
(3,  '2026-01-15', 'Active'),
(4,  '2026-01-20', 'Active'),
(5,  '2026-01-25', 'Active'),
(6,  '2026-02-01', 'Active'),
(7,  '2026-02-05', 'Active'),
(8,  '2026-02-10', 'Active'),
(9,  '2026-02-15', 'Cancelled'),
(10, '2026-02-20', 'Active');
 
-- Mission (15 rows)

--   TO VERIFY TRUCK ID
-- truck_id::--  1=GMC Savana(Tourism), 2=Ford Transit(Tourism), 3=Mercedes Sprinter(Tourism)
--    4=GMC Sierra(Heavyweight), 5=Ford F750(Heavyweight), 6=Isuzu(Heavyweight)
--    7=Mack(SuperHeavy), 8=Freightliner(SuperHeavy), 9=Kenworth(SuperHeavy), 10=Volvo(SuperHeavy)
INSERT INTO Mission (reservation_id, truck_id, driver_id, rendezvous_place, req_truck_type, planned_start, planned_end, actual_start, actual_end, odometer_before, odometer_after, status) VALUES
(1,  4, 7, '3400 Rue Griffith, Saint-Laurent, Montreal',     'Heavyweight',       '2026-02-02 08:00:00', '2026-02-06 17:00:00', '2026-02-02 08:15:00', '2026-02-06 17:30:00', 45000, 52900, 'Completed'),  -- mission 1
(2,  1, 3, '2500 Rue Cohen, Saint-Laurent, Montreal',        'Tourism',           '2026-02-09 08:00:00', '2026-02-13 17:00:00', '2026-02-09 08:00:00', '2026-02-13 17:00:00', 32000, 35200, 'Completed'),  -- mission 2
(3,  7, 4, '5000 Rue Hochelaga, Montreal',                   'Super Heavyweight', '2026-02-16 08:00:00', '2026-02-20 17:00:00', '2026-02-16 08:30:00', '2026-02-20 18:00:00', 89000, 96600, 'Completed'),  -- mission 3
(4,  2, 3, '1000 Rue Notre-Dame W, Montreal',                'Tourism',           '2026-02-23 08:00:00', '2026-02-27 17:00:00', '2026-02-23 09:00:00', '2026-02-27 17:00:00', 21000, 23100, 'Completed'),  -- mission 4
(5,  8, 8, '7400 Boul Decarie, Montreal',                    'Super Heavyweight', '2026-03-02 08:00:00', '2026-03-06 17:00:00', '2026-03-02 08:00:00', '2026-03-06 17:00:00', 55000, 63200, 'Completed'),  -- mission 5
(6,  1, 6, '2200 Rue Dickson, Montreal',                     'Tourism',           '2026-03-09 08:00:00', '2026-03-13 17:00:00', '2026-03-09 08:00:00', '2026-03-13 17:00:00', 15000, 16800, 'Completed'),  -- mission 6
(7,  4, 5, '9000 Boul Ray-Lawson, Anjou, Montreal',          'Heavyweight',       '2026-03-11 08:00:00', '2026-03-15 17:00:00', '2026-03-11 08:00:00', '2026-03-15 17:00:00', 52900, 56700, 'Completed'),  -- mission 7
(8,  5, 5, '3600 Rue Jarry E, Montreal',                     'Heavyweight',       '2026-03-16 08:00:00', '2026-03-18 17:00:00', '2026-03-16 08:00:00', '2026-03-18 17:00:00', 28000, 29800, 'Completed'),  -- mission 8
(9,  7, 4, '5800 Boul Metropolitain E, Montreal',            'Super Heavyweight', '2026-02-02 08:00:00', '2026-02-06 17:00:00', '2026-02-02 08:00:00', '2026-02-06 17:00:00', 96600, 104800,'Cancelled'),  -- mission 9
(10, 9, 8, '2100 Rue Transcanadienne, Dorval',               'Super Heavyweight', '2026-02-16 08:00:00', '2026-02-20 17:00:00', '2026-02-16 08:00:00', '2026-02-20 17:00:00', 12000, 20500, 'Completed'),  -- mission 10
(1,  4, 7, '6500 Boul Metropolitain O, Saint-Laurent',       'Heavyweight',       '2026-03-02 08:00:00', '2026-03-06 17:00:00', '2026-03-02 08:00:00', '2026-03-06 17:00:00', 56700, 64200, 'Completed'),  -- mission 11
(2,  1, 6, '4500 Rue Hickmore, Saint-Laurent, Montreal',     'Tourism',           '2026-03-23 08:00:00', '2026-03-27 17:00:00', '2026-03-23 08:15:00', NULL,                  35200, NULL,  'Ongoing'),    -- mission 12
(3,  7, 4, '1800 Rue Stone, Laval',                          'Super Heavyweight', '2026-03-30 08:00:00', '2026-04-03 17:00:00', NULL,                  NULL,                  NULL,  NULL,  'Scheduled'),  -- mission 13
(4,  2, 6, '3000 Boul Le Carrefour, Laval',                  'Tourism',           '2026-04-07 08:00:00', '2026-04-11 17:00:00', NULL,                  NULL,                  NULL,  NULL,  'Scheduled'),  -- mission 14
(5,  8, 1, '2800 Rue Watt, Sainte-Foy, Quebec City',         'Super Heavyweight', '2026-04-14 08:00:00', '2026-04-18 17:00:00', NULL,                  NULL,                  NULL,  NULL,  'Cancelled'),  -- mission 15
(1,  6, 2, '4500 Boul Industriel, Laval',                    'Heavyweight',       '2026-02-16 08:00:00', '2026-02-20 17:00:00', '2026-02-16 08:00:00', '2026-02-20 17:00:00', 64200, 72500, 'Completed'); -- mission 16

-- Invoice (10 rows)
INSERT INTO Invoice (customer_id, invoice_date, total_amount, payment_status, payment_method, payment_date) VALUES
(1, '2026-02-07', 0.00, 'Paid','Credit Card', '2026-02-10'),  -- invoice 1: Bombardier
(2, '2026-02-14',  0.00, 'Paid','Check','2026-02-16'),  -- invoice 2: Couche-Tard
(3, '2026-02-21', 0.00, 'Paid','Credit Card', '2026-02-25'),  -- invoice 3: Metro Richelieu
(4, '2026-02-28', 0.00, 'Unpaid', NULL, NULL),  -- invoice 4: SNC-Lavalin
(5, '2026-03-07',  0.00, 'Paid','Cash', '2026-03-10'),  -- invoice 5: Bell Canada
(6, '2026-03-14', 0.00, 'Unpaid', NULL, NULL),  -- invoice 6: Jean Tremblay
(7, '2026-03-16', 0.00, 'Unpaid', NULL, NULL),  -- invoice 7: Marie Gagnon
(8, '2026-03-21', 0.00, 'Paid','Credit Card', '2026-03-22'),  -- invoice 8: Pierre Lavoie
(1, '2026-03-07', 0.00, 'Unpaid', NULL, NULL),  -- invoice 9: Bombardier 2nd
(10, '2026-03-14', 0.00, 'Paid','Check', '2026-03-16'),  -- invoice 10: Couche-Tard 2nd
(1, '2026-02-21', 0.00, 'Paid','Credit Card', '2026-02-24'); -- invoice 11: Bombardier 3rd
 

-- DROP OLD TRIGGERS IF EXIST
DROP TRIGGER IF EXISTS trg_invoiceline_costs_insert;
DROP TRIGGER IF EXISTS trg_invoice_total_after_insert;


-- TRIGGER 1: Auto calculate duration_cost, km_cost, line_total
DELIMITER $$

CREATE TRIGGER trg_missioninvoice_costs_insert
BEFORE INSERT ON MissionInvoice
FOR EACH ROW
BEGIN
    DECLARE rate_per_hour DECIMAL(10,2);
    DECLARE rate_per_km DECIMAL(10,2);
    DECLARE actual_start DATETIME;
    DECLARE actual_end DATETIME;
    DECLARE odometer_before INT;
    DECLARE odometer_after INT;

    -- Get mission details
    SELECT m.actual_start, m.actual_end, m.odometer_before, m.odometer_after, tt.rate_per_hour, tt.rate_per_km
    INTO actual_start, actual_end, odometer_before, odometer_after, rate_per_hour, rate_per_km
    FROM Mission m
    JOIN Truck t ON m.truck_id = t.truck_id
    JOIN TruckType tt ON t.truck_type = tt.truck_type
    WHERE m.mission_id = NEW.mission_id;

    -- Auto calculate duration_hours and km_traveled from Mission data
    SET NEW.duration_hours = TIMESTAMPDIFF(HOUR, actual_start, actual_end);
    SET NEW.km_traveled = odometer_after - odometer_before;

    -- Auto calculate costs
    SET NEW.duration_cost = NEW.duration_hours * rate_per_hour;
    SET NEW.km_cost  = NEW.km_traveled * rate_per_km;
    SET NEW.line_total = NEW.duration_cost + NEW.km_cost;
END$$

DELIMITER ;


-- TRIGGER 2: Auto update Invoice's total_amount
DELIMITER $$

CREATE TRIGGER trg_invoice_totalupdate
AFTER INSERT ON MissionInvoice
FOR EACH ROW
BEGIN
    UPDATE Invoice
    SET total_amount = (
        SELECT SUM(line_total)
        FROM MissionInvoice
        WHERE invoice_id = NEW.invoice_id
    )
    WHERE invoice_id = NEW.invoice_id;
END$$

DELIMITER ;


INSERT INTO MissionInvoice (invoice_id, mission_id, duration_hours, km_traveled, duration_cost, km_cost, line_total) VALUES
(1, 1,  0, 0, 0, 0, 0),  
(2, 2,  0, 0, 0, 0, 0), 
(3, 3,  0, 0, 0, 0, 0), 
(4, 4,  0, 0, 0, 0, 0), 
(5, 5,  0, 0, 0, 0, 0), 
(6, 6,  0, 0, 0, 0, 0), 
(7, 7,  0, 0, 0, 0, 0), 
(8, 8,  0, 0, 0, 0, 0), 
(9, 11, 0, 0, 0, 0, 0), 
(10, 10, 0, 0, 0, 0, 0),
(11, 16, 0, 0, 0, 0, 0);



