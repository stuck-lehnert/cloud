BEGIN TRANSACTION;

TRUNCATE users CASCADE;
TRUNCATE groups CASCADE;
TRUNCATE projects CASCADE;
TRUNCATE tools CASCADE;

\set hashed_pw '''$2a$12$AgLMKJ.sUu0M3rtk2q.6fO4WWfHMa1g7y5C9dsOFIE7TWx5T0UeaG'''
\set group_id 'SELECT id FROM groups WHERE '
\set user_id 'SELECT id FROM users WHERE '
\set tool_id 'SELECT id FROM tools WHERE '
\set product_id 'SELECT id FROM products WHERE '
\set customer_id 'SELECT id FROM customers WHERE '

INSERT INTO groups (name)
VALUES ('Minister'),
       ('Staatsminister'),
       ('Kabinett'),
       ('Opposition'),
       ('MdB'),
       ('Ex-MdB'),
       ('MdB-Rente');

INSERT INTO users (salutation, first_name, last_name, username, password)
VALUES ('Herr',     'Olaf',      'Scholz',     'olaf.scholz',        :hashed_pw),
       ('Herr',     'Friedrich', 'Merz',       'friedrich.merz',     :hashed_pw),
       ('Herr',     'Konrad',    'Adenauer',   'konrad.adenauer',    :hashed_pw),
       ('Frau',     'Katharina', 'Reiche',     'katharina.reiche',   :hashed_pw),
       ('Herr',     'Lars',      'Klingbeil',  'lars.klingbeil',     :hashed_pw),
       ('Herr',     'Karl',      'Lauterbach', 'karl.lauterbach',    :hashed_pw),
       ('Herr',     'Jens',      'Spahn',      'jens.spahn',         :hashed_pw),
       ('Herr',     'Boris',     'Pistorius',  'boris.pistorius',    :hashed_pw),
       ('Frau',     'Bärbel',    'Bas',        'baerbel.bas',        :hashed_pw),
       ('Herr',     'Robert',    'Habeck',     'robert.habeck',      :hashed_pw),
       ('Herr',     'Christian', 'Lindner',    'christian.lindner',  :hashed_pw),
       ('Frau',     'Annalena',  'Baerbock',   'annalena.baerbock',  :hashed_pw),
       ('Herr',     'Dietmar',   'Bartsch',    'dietmar.bartsch',    :hashed_pw),
       ('Frau',     'Alice',     'Weidel',     'alice.weidel',       :hashed_pw),
       ('Herr',     'Philipp',   'Amthor',     'philipp.amthor',     :hashed_pw),
       ('Frau Dr.', 'Angela',    'Merkel',     'angela.merkel',      :hashed_pw),
       ('Herr Dr.', 'Karsten',   'Wildberger', 'karsten.wildberger', :hashed_pw),
       ('Herr Dr.', 'Johann',    'Wadephul',   'johann.wadephul',    :hashed_pw),
       ('Frau Dr.', 'Stefanie',  'Hubig',      'stefanie.hubig',     :hashed_pw);


INSERT INTO group_member_groups (group_id, member_group_id)
VALUES ((:group_id name = 'Kabinett'),  (:group_id name = 'Minister')),
       ((:group_id name = 'Kabinett'),  (:group_id name = 'Staatsminister')),
       ((:group_id name = 'MdB'),       (:group_id name = 'Kabinett')),
       ((:group_id name = 'MdB'),       (:group_id name = 'Opposition')),
       ((:group_id name = 'MdB-Rente'), (:group_id name = 'MdB')),
       ((:group_id name = 'MdB-Rente'), (:group_id name = 'Ex-MdB'));

INSERT INTO group_member_users (group_id, member_user_id)
VALUES ((:group_id name = 'Kabinett'),       (:user_id username = 'friedrich.merz')),
       ((:group_id name = 'Minister'),       (:user_id username = 'katharina.reiche')),
       ((:group_id name = 'Minister'),       (:user_id username = 'lars.klingbeil')),
       ((:group_id name = 'Minister'),       (:user_id username = 'boris.pistorius')),
       ((:group_id name = 'Minister'),       (:user_id username = 'baerbel.bas')),
       ((:group_id name = 'Minister'),       (:user_id username = 'karsten.wildberger')),
       ((:group_id name = 'Minister'),       (:user_id username = 'stefanie.hubig')),
       ((:group_id name = 'MdB'),            (:user_id username = 'robert.habeck')),
       ((:group_id name = 'MdB'),            (:user_id username = 'karl.lauterbach')),
       ((:group_id name = 'MdB'),            (:user_id username = 'jens.spahn')),
       ((:group_id name = 'Ex-MdB'),         (:user_id username = 'angela.merkel')),
       ((:group_id name = 'Ex-MdB'),         (:user_id username = 'konrad.adenauer')),
       ((:group_id name = 'Ex-MdB'),         (:user_id username = 'christian.lindner')),
       ((:group_id name = 'Ex-MdB'),         (:user_id username = 'annalena.baerbock')),
       ((:group_id name = 'Opposition'),     (:user_id username = 'robert.habeck')),
       ((:group_id name = 'Opposition'),     (:user_id username = 'dietmar.bartsch')),
       ((:group_id name = 'Opposition'),     (:user_id username = 'alice.weidel')),
       ((:group_id name = 'Staatsminister'), (:user_id username = 'philipp.amthor'));

INSERT INTO user_roles (user_id, role_name)
VALUES ((:user_id username = 'friedrich.merz'), ':admin');


INSERT INTO tools (custom_id, brand, category, label)
VALUES (1,  'Hilti',       'Akkuschrauber',   'SF 6H-A'),
       (2,  'Makita',      'Akkuschrauber',   'DDF484Z'),
       (3,  'Milwaukee',   'Akkuschrauber',   'M18 FDD-502C'),
       (4,  'BTI',         'Laser',           'Entfernungsmesser 50m'),
       (5,  'Hilti',       'Laser',           'PD-E'),
       (6,  'Makita',      'Laser',           'LD030P'),
       (7,  'Milwaukee',   'Laser',           '2260-20'),
       (8,  'Hilti',       'Kabeltrommel',    '50m'),
       (9,  'BTI',         'Kabeltrommel',    '25m'),
       (12, 'Makita',      'Kabeltrommel',    '20m'),
       (11, 'Milwaukee',   'Kabeltrommel',    '30m'),
       (10, 'Makita',      'Akkuschrauber',   'DHP458Z'),
       (13, 'Hilti',       'Akkuschrauber',   'SF 10W-A'),
       (14, 'BTI',         'Akkuschrauber',   '18V'),
       (15, 'Milwaukee',   'Akkuschrauber',   'M18 CBLPD-502C'),
       (16, 'Hilti',       'Bohrhammer',      'TE 30-AVR'),
       (17, 'Makita',      'Bohrhammer',      'HR2470'),
       (18, 'Milwaukee',   'Bohrhammer',      'M18 CHX-0'),
       (19, 'BTI',         'Bohrhammer',      'SDS Plus 5.0J'),
       (20, 'Makita',      'Schleifer',       'GA5030'),
       (21, 'Milwaukee',   'Schleifer',       'M18 CAG115X'),
       (22, 'Hilti',       'Schleifer',       'AG 600-A36'),
       (23, 'BTI',         'Winkelschleifer', '115mm'),
       (24, 'Makita',      'Schleifer',       'DGA452Z'),
       (25, 'Milwaukee',   'Schleifer',       'M18 CAG-115X'),
       (26, 'Hilti',       'Handkreissäge',   'SC 60W-A'),
       (27, 'Makita',      'Handkreissäge',   'HS6601'),
       (28, 'Milwaukee',   'Handkreissäge',   'M18 FCS66-0'),
       (29, 'BTI',         'Handkreissäge',   '190mm'),
       (30, 'Hilti',       'Trennschneider',  'DSH 600X'),
       (31, 'Makita',      'Trennschneider',  '4100KB'),
       (32, 'Milwaukee',   'Trennschneider',  'M18 CCS55-0'),
       (33, 'BTI',         'Trennschneider',  '230mm'),
       (34, 'Hilti',       'Bohrmaschine',    'TE 7-C'),
       (35, 'Makita',      'Bohrmaschine',    'HP1630K'),
       (36, 'Milwaukee',   'Bohrmaschine',    'M18 BPD-502C'),
       (37, 'BTI',         'Bohrmaschine',    '50W'),
       (38, 'Hilti',       'Schlagschrauber', 'SI 30-A'),
       (39, 'Makita',      'Schlagschrauber', 'TW1000'),
       (40, 'Milwaukee',   'Schlagschrauber', 'M18 FID-502C');

INSERT INTO customers (salutation, name)
VALUES ('Das', 'Volk');

INSERT INTO groups (name, deletable)
VALUES ('[Leiter] Ausschuss', FALSE),
       ('[Mitglieder] Ausschuss', FALSE),
       ('[Besucher] Ausschuss', FALSE);

INSERT INTO projects (title, customer_id, leader_group_id, member_group_id, visitor_group_id)
VALUES ('Ausschuss', (:customer_id name = 'Volk'), (:group_id name = '[Leiter] Ausschuss'), (:group_id name = '[Mitglieder] Ausschuss'), (:group_id name = '[Besucher] Ausschuss'));

COMMIT;

