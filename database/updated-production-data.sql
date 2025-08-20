--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.companies VALUES ('a085c012-3518-4dd5-be10-e7d3b579ace7', 'CU0001', 'Rakesh Company', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, NULL, NULL, '2025-08-10 13:12:06.997213');
INSERT INTO public.companies VALUES ('3d61e035-e790-4e95-85dd-5a7d7d4766cc', 'CU0011', 'Rakesh Company', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, NULL, NULL, '2025-08-10 13:48:05.857752');
INSERT INTO public.companies VALUES ('677c2752-c8a0-4023-90a6-11817ec32056', 'CU0021', 'ABC Company', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, NULL, NULL, '2025-08-10 19:10:13.127807');
INSERT INTO public.companies VALUES ('adee4d85-29fe-476d-b02d-6fccc6a593d6', 'CU0031', 'Test Manufacturing Co', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, NULL, NULL, '2025-08-10 19:15:00.140242');
INSERT INTO public.companies VALUES ('98bf4d99-78ef-4fda-a341-2900df5c981b', 'CU0041', 'Test Manufacturing Co', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, NULL, NULL, '2025-08-10 19:15:18.71735');
INSERT INTO public.companies VALUES ('fdfe21ab-e049-45a9-b232-8b1dd518de6b', 'CU0051', 'Test Manufacturing Co 2', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, NULL, NULL, '2025-08-10 19:16:07.269528');
INSERT INTO public.companies VALUES ('6f1177cb-2333-4319-b38b-f9b7c2569c45', 'CU0061', 'Test Manufacturing Co 3', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, NULL, NULL, '2025-08-10 19:16:29.755147');
INSERT INTO public.companies VALUES ('9b374adb-f817-4b57-9f21-8ccfebb4203c', 'CU0071', 'ABC Company', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, NULL, NULL, '2025-08-10 19:17:34.8544');
INSERT INTO public.companies VALUES ('d71e8f62-7321-453b-bbc0-cf863556c0f5', 'CU0081', 'Test Manufacturing Co', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, NULL, NULL, '2025-08-10 19:19:36.879772');
INSERT INTO public.companies VALUES ('da6b3b2a-b200-4903-aec1-96e4fbf25241', 'CU0091', 'Test Manufacturing Co', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, NULL, NULL, '2025-08-10 19:20:01.368199');
INSERT INTO public.companies VALUES ('9eef7c4f-0eb9-498c-b1f7-94ea77311c4c', 'CU0101', 'Test Manufacturing Co', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, NULL, NULL, '2025-08-10 19:20:14.529818');
INSERT INTO public.companies VALUES ('05314552-a08c-48b8-899a-7f5107e8b2d6', 'CU0111', 'Test Company Inc', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, NULL, NULL, '2025-08-10 19:32:44.751697');
INSERT INTO public.companies VALUES ('03ed7cf9-3bf0-427f-b3ea-b23962de8eb8', 'CU0121', 'Real Customer Inc', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, NULL, NULL, '2025-08-10 19:34:15.66116');
INSERT INTO public.companies VALUES ('62c6d07c-e85b-41bc-b10b-2fd5527b75ea', 'CU0131', 'Vineeth Company', NULL, '', '', '', '', 'United States', '', NULL, '', '', '2025-08-11 19:37:00.071655');
INSERT INTO public.companies VALUES ('cd563762-7cbf-437c-a950-08d29349ec1b', 'CU0151', 'Cherry Hill', NULL, '123-456-7890', '123 Test St', 'Test City', 'NJ', 'United States', '', NULL, '', '', '2025-08-13 13:05:21.668225');
INSERT INTO public.companies VALUES ('fcef1d6c-b084-416f-b339-9167ab96f791', 'CU0152', 'Vin Company', 'vin@s.com', '', '', '', '', 'United States', '', NULL, '', '', '2025-08-13 14:38:53.999531');


--
-- Data for Name: db_test_markers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.users VALUES ('61188f02-e31d-4da6-88d1-58d928a30413', 'alisyam.vineeth@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Customer one ', false, '2025-08-13 13:04:59.811424', NULL, NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, true, NULL, NULL, NULL, 'cd563762-7cbf-437c-a950-08d29349ec1b', 'Cherry Hill company', 'customer', NULL, NULL, NULL, NULL, NULL, NULL, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('c483ecef-f572-4406-84f7-b1972d9870bd', 'rakeshrahul33@gmail.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Customer Two', false, '2025-08-13 13:05:31.615349', NULL, NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, true, NULL, NULL, NULL, 'cd563762-7cbf-437c-a950-08d29349ec1b', 'Cherry Hill', 'customer', NULL, NULL, NULL, NULL, NULL, NULL, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('42300ebc-58b7-4730-9c28-fa395996035f', 'vineethalisyam@gmail.com', '$2b$10$YKSt7BpJtGxOr54ahk4ZS.VjdZczqcWNunuHV3l/mnxMBS0kq51ki', 'Vineeth Alisyam', false, '2025-08-11 16:55:02.810909', NULL, NULL, '', '', '', '', 'United States', '', NULL, true, NULL, NULL, NULL, NULL, 'asdf', 'supplier', '', '["ISO 9001","AS9100 (Aerospace)"]', '["CNC Machining","3D Printing/Additive Manufacturing","Sand Casting"]', NULL, NULL, 'V0012', true, false, '["Wet Paint","Electroless Nickel","Zinc Plating"]', '', '', '', '["Electronics & Semiconductors","Consumer Products"]', '', '', '', '', '', false, false);
INSERT INTO public.users VALUES ('ee46b9c3-0886-4f22-abc7-80ec042b1369', 'vineeth@stone-flake.com', '$2b$10$JUBinrf4OjqWhwquU3TbReAmYbgG6V3isB1PExlDeU8ZBUMWz4yO.', 'Vineeth', true, '2025-07-29 02:44:58.82961', 'TechCorp Industries', NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, true, NULL, NULL, NULL, NULL, NULL, 'admin', NULL, NULL, NULL, NULL, NULL, NULL, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('bee6331c-61a5-4641-a631-daa64827e12a', 'test-customer@reproduce-bug.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Bug Reproduction Customer', false, '2025-08-10 19:34:40.064395', NULL, NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, true, NULL, NULL, NULL, NULL, 'Bug Test Company', 'customer', NULL, NULL, NULL, NULL, NULL, NULL, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false);
INSERT INTO public.users VALUES ('97e63857-9830-4c6a-a576-d1c2a5c12acf', 'vineethalisyam@gmail.com', '$2b$10$tJu.Dm.FbtiqJjLDEaPvXORRHHUqukj3sKeCQMye0svWwrw1CxZBy', 'Vineeth Alisyam', false, '2025-08-11 19:37:13.470266', NULL, NULL, NULL, NULL, NULL, NULL, 'United States', NULL, NULL, true, NULL, NULL, NULL, '62c6d07c-e85b-41bc-b10b-2fd5527b75ea', 'Vineeth Company', 'customer', NULL, NULL, NULL, NULL, NULL, NULL, false, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, false);


--
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.files VALUES ('79e51da8-53b1-42e9-a866-86cb9c2394c4', '97e63857-9830-4c6a-a576-d1c2a5c12acf', 'Spline.STEP', 'uploads/files-1754943959010-781449512.step', 255227, 'step', 'rfq', '1f3fe17b-1506-49f8-aebd-729e3f3ec8a3', '2025-08-11 20:25:59.42214', NULL, NULL, NULL);
INSERT INTO public.files VALUES ('3b1d766c-acb9-4ca9-9ec1-1ce2b8deffd5', '97e63857-9830-4c6a-a576-d1c2a5c12acf', 'PO-8b8282ed.pdf', 'uploads/files-1754943959200-76909839.pdf', 950931, 'pdf', 'rfq', '1f3fe17b-1506-49f8-aebd-729e3f3ec8a3', '2025-08-11 20:25:59.505767', NULL, NULL, NULL);
INSERT INTO public.files VALUES ('2670d416-3fd4-42d6-adf8-2d5f64c4a57f', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', 'Part1.STEP', 'uploads/files-1755610530830-431815084.step', 296348, 'step', 'rfq', 'd50922d7-e6bd-4731-ae6e-8f3c2a4e0e01', '2025-08-19 13:35:30.927234', NULL, NULL, NULL);
INSERT INTO public.files VALUES ('3227ecc8-031b-41fb-8ad0-e2c288182f39', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', '504212 Motor Pan Rev-R 01-31-25.pdf', 'uploads/files-1755610530852-528617496.pdf', 175968, 'pdf', 'rfq', 'd50922d7-e6bd-4731-ae6e-8f3c2a4e0e01', '2025-08-19 13:35:31.116734', NULL, NULL, NULL);
INSERT INTO public.files VALUES ('1feb5f0d-55fa-4e5a-8268-5b698efbe482', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', 'Business Profile.pdf', 'uploads/files-1755611134895-501324640.pdf', 88585, 'pdf', 'rfq', 'f66f1b3f-1947-4170-ae54-c4d3dc83163e', '2025-08-19 13:45:34.933076', NULL, NULL, NULL);


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: message_attachments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.notifications VALUES ('80a23527-2fa4-481e-8901-9d9a0837880f', '42300ebc-58b7-4730-9c28-fa395996035f', 'status_update', 'Quote Accepted', 'Your quote for "asdf" has been accepted. Purchase order will be sent soon.', false, 'f5e8fd09-542a-4414-9c43-28bd1871123e', '2025-08-14 01:39:50.479217');
INSERT INTO public.notifications VALUES ('d609828d-6d4e-4484-870b-db67497b18cb', '42300ebc-58b7-4730-9c28-fa395996035f', 'order_confirmation', 'Purchase Order Created', 'Purchase order PO-0001 has been created from your accepted quote.', false, '5bf39c5b-819c-43c8-934f-2d2debe8cf00', '2025-08-14 01:39:56.076266');
INSERT INTO public.notifications VALUES ('7dbb44d1-0228-4eff-803f-d8dabc936b7b', '42300ebc-58b7-4730-9c28-fa395996035f', 'status_update', 'Purchase Order Archived', 'Purchase order PO-0001 has been completed and archived', false, '5bf39c5b-819c-43c8-934f-2d2debe8cf00', '2025-08-14 01:47:47.835643');
INSERT INTO public.notifications VALUES ('2d87372e-ab68-4e7d-89a9-744033a04d14', '42300ebc-58b7-4730-9c28-fa395996035f', 'rfq_assignment', 'New RFQ Assigned', 'You have been assigned a new RFQ for: Compressor Piston', true, 'd1359c0c-0f36-408f-9d89-35c607253ecd', '2025-08-19 11:34:13.81597');
INSERT INTO public.notifications VALUES ('a6f6bb30-ac4c-4959-a114-432c60113a2e', '42300ebc-58b7-4730-9c28-fa395996035f', 'status_update', 'Quote Not Selected', 'Your quote for "TEst " was not selected. Admin feedback: Thank you for your quote. We have decided to go with other supplier for this project because of lead time constraints', false, '5d041484-8993-4ce6-af01-25b94d0c8ffa', '2025-08-19 11:45:20.09461');
INSERT INTO public.notifications VALUES ('6622fbe2-fb80-4974-a023-a2f070f87bc7', '42300ebc-58b7-4730-9c28-fa395996035f', 'status_update', 'Quote Accepted', 'Your quote for "TEst " has been accepted. Purchase order will be sent soon.', false, '5d041484-8993-4ce6-af01-25b94d0c8ffa', '2025-08-19 11:56:50.253389');
INSERT INTO public.notifications VALUES ('c9a32528-a3b2-4f4d-8faf-5faba0bc6caf', '42300ebc-58b7-4730-9c28-fa395996035f', 'status_update', 'Quote Not Selected', 'Your quote for "TEst " was not selected. Admin feedback: Thank you for your detailed quote submission. While your pricing was competitive, we have selected another supplier who can meet our accelerated timeline requirements. We appreciate your effort and look forward to future opportunities to work together.', false, '5d041484-8993-4ce6-af01-25b94d0c8ffa', '2025-08-19 11:57:01.815481');
INSERT INTO public.notifications VALUES ('2aadba40-cb81-4d38-8e0f-3176c62271ed', '42300ebc-58b7-4730-9c28-fa395996035f', 'rfq_assignment', 'New RFQ Assigned', 'You have been assigned a new RFQ for: test', true, 'd50922d7-e6bd-4731-ae6e-8f3c2a4e0e01', '2025-08-19 13:35:32.289701');
INSERT INTO public.notifications VALUES ('527bb0a2-e091-42ec-aba3-8e99983b3917', '42300ebc-58b7-4730-9c28-fa395996035f', 'rfq_assignment', 'New RFQ Assigned', 'You have been assigned a new RFQ for: teste', true, 'ce778e0d-f9fe-4831-bbf1-398fc1b97292', '2025-08-19 13:37:22.007916');
INSERT INTO public.notifications VALUES ('9cc12d6b-6bb3-46df-ab29-0554b4d6bee7', '42300ebc-58b7-4730-9c28-fa395996035f', 'rfq_assignment', 'New RFQ Assigned', 'You have been assigned a new RFQ for: new test', true, 'f66f1b3f-1947-4170-ae54-c4d3dc83163e', '2025-08-19 13:45:36.0712');
INSERT INTO public.notifications VALUES ('63e3aa22-286c-4750-b0b2-e9d95c4f8312', '42300ebc-58b7-4730-9c28-fa395996035f', 'rfq_assignment', 'New RFQ Assigned', 'You have been assigned a new RFQ for: asdf', true, '1ec1f8b2-4569-4a69-93b3-8d7c14fd5b0e', '2025-08-13 20:31:00.448444');
INSERT INTO public.notifications VALUES ('059b6aee-d1cb-400e-b084-0927ad636f6f', '42300ebc-58b7-4730-9c28-fa395996035f', 'rfq_assignment', 'New RFQ Assigned', 'You have been assigned a new RFQ for: TEst ', true, '273526ed-575b-451c-8f20-a1a457e8b806', '2025-08-13 20:24:16.27838');


--
-- Data for Name: rfqs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.rfqs VALUES ('test-customer-rfq-001', 'bee6331c-61a5-4641-a631-daa64827e12a', 'Customer Test Project 1', 'Aluminum', 'Standard', 50, 'First test RFQ for customer', 'quoted', '2025-08-10 19:34:43.272989', NULL, NULL, NULL, NULL, false, NULL, NULL, NULL);
INSERT INTO public.rfqs VALUES ('test-customer-rfq-002', 'bee6331c-61a5-4641-a631-daa64827e12a', 'Customer Test Project 2', 'Steel', 'Tight', 25, 'Second test RFQ for customer', 'quoted', '2025-08-10 19:35:16.170726', NULL, NULL, NULL, NULL, false, NULL, NULL, NULL);
INSERT INTO public.rfqs VALUES ('1f3fe17b-1506-49f8-aebd-729e3f3ec8a3', '97e63857-9830-4c6a-a576-d1c2a5c12acf', 'Test Project', 'steel', 'precision', 123, '', 'submitted', '2025-08-11 20:25:58.410489', '1045', 'Black Oxide', 'forging', 'Cold Forging', false, NULL, NULL, NULL);
INSERT INTO public.rfqs VALUES ('e94c8601-2901-457c-bc31-85571a3b4128', '61188f02-e31d-4da6-88d1-58d928a30413', 'Test Project for Customer One', 'Aluminum', '±0.1mm', 10, 'This is a test RFQ from Customer One', 'submitted', '2025-08-13 13:18:59.095463', '6061', 'Anodized', 'CNC Machining', 'Milling', true, NULL, NULL, NULL);
INSERT INTO public.rfqs VALUES ('638b4446-18ad-499b-8010-7fb17bee886d', 'c483ecef-f572-4406-84f7-b1972d9870bd', 'Test Project', 'steel', 'standard', 1, '', 'submitted', '2025-08-13 13:29:56.785121', '1045', 'Cerakote', '', '', false, NULL, NULL, NULL);
INSERT INTO public.rfqs VALUES ('273526ed-575b-451c-8f20-a1a457e8b806', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', 'TEst ', 'aluminum', 'Standard', 100, 'test', 'submitted', '2025-08-13 20:24:15.411364', NULL, NULL, NULL, NULL, false, NULL, 'SQTE-005', NULL);
INSERT INTO public.rfqs VALUES ('1ec1f8b2-4569-4a69-93b3-8d7c14fd5b0e', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', 'asdf', 'fasd', 'Standard', 12, 'asdf', 'submitted', '2025-08-13 20:30:59.689777', NULL, NULL, NULL, NULL, false, NULL, 'SQTE-006', NULL);
INSERT INTO public.rfqs VALUES ('fe35808a-1e9a-47fb-b3d1-17b5b3e7041e', '97e63857-9830-4c6a-a576-d1c2a5c12acf', 'Compressor Piston', 'brass', 'tight', 1, '', 'submitted', '2025-08-19 11:33:06.148165', 'C260', 'Zinc Plating', 'recommendation', 'Recommend based on my specifications', true, NULL, NULL, NULL);
INSERT INTO public.rfqs VALUES ('test-rfq-123', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', 'Test RFQ Project', 'Aluminum', 'Standard', 10, NULL, 'submitted', '2025-08-09 01:46:05.012929', NULL, NULL, NULL, NULL, false, NULL, NULL, NULL);
INSERT INTO public.rfqs VALUES ('6b1a6ebf-e930-4f02-a3a0-f68e6c2afe29', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', 'Sample Plastic', 'Nylon', 'Standard', 1000, 'Plastic pellets', 'submitted', '2025-08-10 13:50:19.066659', NULL, NULL, NULL, NULL, false, NULL, 'SQTE-001', NULL);
INSERT INTO public.rfqs VALUES ('d1359c0c-0f36-408f-9d89-35c607253ecd', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', 'Compressor Piston', 'Brass', 'Standard', 100, 'Testing', 'submitted', '2025-08-19 11:34:13.367196', NULL, NULL, NULL, NULL, false, NULL, 'SQTE-007', NULL);
INSERT INTO public.rfqs VALUES ('2584696b-1778-4dad-ae98-25ccefcc641f', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', 'Testing PO real Time Tracking', 'Steel', 'Standard', 122, 'This is just a test', 'submitted', '2025-08-10 17:53:35.821622', NULL, NULL, NULL, NULL, false, NULL, 'SQTE-002', NULL);
INSERT INTO public.rfqs VALUES ('59235cf9-9f18-44bb-81a3-854819ce7ae4', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', 'Testing Attachments', 'cast iron', 'Standard', 50, 'test', 'submitted', '2025-08-10 17:59:49.048676', NULL, NULL, NULL, NULL, false, NULL, 'SQTE-003', NULL);
INSERT INTO public.rfqs VALUES ('d50922d7-e6bd-4731-ae6e-8f3c2a4e0e01', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', 'test', 'aaest', 'Standard', 123, 'asf', 'submitted', '2025-08-19 13:35:31.340443', NULL, NULL, NULL, NULL, false, NULL, 'SQTE-008', NULL);
INSERT INTO public.rfqs VALUES ('ef14bc4b-c03e-4180-917a-10cff3ee068f', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', 'second project', 'Titanium', 'Standard', 123, 'test', 'quoted', '2025-08-10 18:23:30.021806', NULL, NULL, NULL, NULL, false, NULL, 'SQTE-004', NULL);
INSERT INTO public.rfqs VALUES ('ce778e0d-f9fe-4831-bbf1-398fc1b97292', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', 'teste', 'test', 'Standard', 12, 'descriptoin', 'submitted', '2025-08-19 13:37:21.568759', NULL, NULL, NULL, NULL, false, NULL, 'SQTE-009', NULL);
INSERT INTO public.rfqs VALUES ('f66f1b3f-1947-4170-ae54-c4d3dc83163e', 'ee46b9c3-0886-4f22-abc7-80ec042b1369', 'new test', 'al', 'Standard', 12, 'Project Description field', 'submitted', '2025-08-19 13:45:35.276043', NULL, NULL, NULL, NULL, false, NULL, 'SQTE-010', 'special instructions field');


--
-- Data for Name: supplier_quotes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.supplier_quotes VALUES ('f5e8fd09-542a-4414-9c43-28bd1871123e', '1ec1f8b2-4569-4a69-93b3-8d7c14fd5b0e', '42300ebc-58b7-4730-9c28-fa395996035f', 234.00, 23, NULL, NULL, 'accepted', '2025-08-14 01:39:21.100129', '2025-08-14 01:39:50.209', 'SQTE-006', 'USD', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Net 30', NULL);
INSERT INTO public.supplier_quotes VALUES ('924411cb-744a-4a7f-943d-95dfe7c9f370', 'd1359c0c-0f36-408f-9d89-35c607253ecd', '42300ebc-58b7-4730-9c28-fa395996035f', 2399.95, 26, NULL, NULL, 'not_selected', '2025-08-19 11:35:02.831262', '2025-08-19 11:35:33.424', 'SQTE-007', 'USD', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Net 30', NULL);
INSERT INTO public.supplier_quotes VALUES ('5d041484-8993-4ce6-af01-25b94d0c8ffa', '273526ed-575b-451c-8f20-a1a457e8b806', '42300ebc-58b7-4730-9c28-fa395996035f', 2933.00, 23, NULL, NULL, 'not_selected', '2025-08-19 11:44:14.083036', '2025-08-19 11:57:01.417', 'SQTE-005', 'USD', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Net 30', 'Thank you for your detailed quote submission. While your pricing was competitive, we have selected another supplier who can meet our accelerated timeline requirements. We appreciate your effort and look forward to future opportunities to work together.');


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.purchase_orders VALUES ('5bf39c5b-819c-43c8-934f-2d2debe8cf00', 'PO-0001', 'f5e8fd09-542a-4414-9c43-28bd1871123e', '42300ebc-58b7-4730-9c28-fa395996035f', '1ec1f8b2-4569-4a69-93b3-8d7c14fd5b0e', 'archived', 234.00, '2025-08-22 00:00:00', NULL, NULL, '2025-08-14 01:39:55.895786', '2025-08-14 01:46:45.467', '/uploads/invoice-1755136047715-179284208.pdf', '2025-08-14 01:47:28.017', NULL, '2025-08-14 01:48:55.250495');


--
-- Data for Name: rfq_assignments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

INSERT INTO public.rfq_assignments VALUES ('372876eb-46c1-4f18-a6c2-045d56f3dd8b', '1ec1f8b2-4569-4a69-93b3-8d7c14fd5b0e', '42300ebc-58b7-4730-9c28-fa395996035f', '2025-08-13 20:30:59.901726', 'quoted');
INSERT INTO public.rfq_assignments VALUES ('20250535-8e31-4507-b5cc-790dbfb37647', 'd1359c0c-0f36-408f-9d89-35c607253ecd', '42300ebc-58b7-4730-9c28-fa395996035f', '2025-08-19 11:34:13.559915', 'quoted');
INSERT INTO public.rfq_assignments VALUES ('33dbc8ff-e0de-48d9-b203-a632867c92b5', '273526ed-575b-451c-8f20-a1a457e8b806', '42300ebc-58b7-4730-9c28-fa395996035f', '2025-08-13 20:24:15.64657', 'quoted');
INSERT INTO public.rfq_assignments VALUES ('6da383ac-4a48-414a-8a8c-b885c769a314', 'd50922d7-e6bd-4731-ae6e-8f3c2a4e0e01', '42300ebc-58b7-4730-9c28-fa395996035f', '2025-08-19 13:35:31.785796', 'assigned');
INSERT INTO public.rfq_assignments VALUES ('1e147c6a-afba-4e3e-aab3-8a83cedd5d7e', 'ce778e0d-f9fe-4831-bbf1-398fc1b97292', '42300ebc-58b7-4730-9c28-fa395996035f', '2025-08-19 13:37:21.75598', 'assigned');
INSERT INTO public.rfq_assignments VALUES ('cc3d7830-b5e9-4cf9-b015-625497b02040', 'f66f1b3f-1947-4170-ae54-c4d3dc83163e', '42300ebc-58b7-4730-9c28-fa395996035f', '2025-08-19 13:45:35.615296', 'assigned');


--
-- Data for Name: sales_quotes; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: sales_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: sales_invoices; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- Data for Name: shipments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--



--
-- PostgreSQL database dump complete
--

