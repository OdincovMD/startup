-- ==========================================================
-- Seed data for Синтезум platform
-- Password for all users: Test1234
-- Run: psql -d <dbname> -f backend/migrations/seed_data.sql
-- ==========================================================

BEGIN;

-- =========================
--          ROLES
-- =========================
INSERT INTO roles (id, name) VALUES
  (1, 'student'),
  (2, 'researcher'),
  (3, 'lab_admin'),
  (4, 'lab_representative'),
  (5, 'platform_admin')
ON CONFLICT (name) DO NOTHING;

SELECT setval('roles_id_seq', 5, true);

-- =========================
--          USERS
-- =========================
-- Пароль для всех аккаунтов: Test1234 (хеш через app.core.queries.password_utils.hash_password)
-- Hash: $2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2

INSERT INTO users (id, public_id, email, hashed_password, role_id, full_name, email_verified, created_at) VALUES
  -- platform admin
  (1,  'a2d98e77e064851a026167dd', 'admin@sintezum.ru',           '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 5, 'Администратор Платформы',        true,  NOW() - INTERVAL '180 days'),

  -- lab_admin (org representatives) — owners of organizations
  (2,  'f1b062bfe5644478db5af20a', '',               '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 3, 'Иванов Алексей Петрович',        true,  NOW() - INTERVAL '120 days'),
  (3,  'c5e4a9231b7aa5e3a55aa66b', 'petrova@spbgu.ru',            '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 3, 'Петрова Мария Ивановна',         true,  NOW() - INTERVAL '90 days'),
  (4,  'c40d0713152a55b9306ee545', 'sidorov@mipt.ru',             '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 3, 'Сидоров Дмитрий Сергеевич',      true,  NOW() - INTERVAL '60 days'),
  (5,  'e0da16e6cdfe5dc70ca9013b', 'kuznetsova@nsu.ru',           '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 3, 'Кузнецова Елена Александровна',  true,  NOW() - INTERVAL '45 days'),
  (6,  '8f272107fbecf0ca6f014b78', 'volkov@hse.ru',               '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 3, 'Волков Андрей Николаевич',       true,  NOW() - INTERVAL '30 days'),

  -- lab_representative — owners of standalone labs
  (7,  '0f43d9847eff43cd69302636', 'morozova@ras.ru',             '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 4, 'Морозова Анна Викторовна',       true,  NOW() - INTERVAL '100 days'),
  (8,  '13afb86b778aabbc61486da3', 'sokolov@jinr.ru',             '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 4, 'Соколов Игорь Владимирович',     true,  NOW() - INTERVAL '80 days'),
  (9,  'fdd4f086d78022b6871c505f', 'novikova@itmo.ru',            '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 4, 'Новикова Ольга Дмитриевна',      true,  NOW() - INTERVAL '20 days'),

  -- researchers
  (10, '9bbe1f12d1b34bfc854458b4', 'fedorov@phys.msu.ru',         '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 2, 'Фёдоров Николай Андреевич',      true,  NOW() - INTERVAL '70 days'),
  (11, '472b774b2750815764f4f099', 'egorova@chem.spbgu.ru',       '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 2, 'Егорова Татьяна Сергеевна',      true,  NOW() - INTERVAL '55 days'),
  (12, 'c80f4eebb69fa68727e65afc', 'kozlov@bio.nsu.ru',           '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 2, 'Козлов Виктор Павлович',         true,  NOW() - INTERVAL '40 days'),

  -- students
  (13, 'a0e37debce000a2114e6dc96', 'student1@mail.ru',            '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 1, 'Смирнов Артём Олегович',         true,  NOW() - INTERVAL '35 days'),
  (14, 'b89d2eb3b76f1e1103b1c71b', 'student2@mail.ru',            '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 1, 'Лебедева Дарья Максимовна',      true,  NOW() - INTERVAL '25 days'),
  (15, 'dd58b2152aee7d04de070672', 'student3@mail.ru',            '$2b$12$i604wknC42W/pyxuN82QHOxgsLrjUeYm3j7q1SMb/ICwmVcmoAOP2', 1, 'Попов Кирилл Александрович',     true,  NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

SELECT setval('users_id_seq', 15, true);

-- =========================
--      ORGANIZATIONS
-- =========================

INSERT INTO organizations (id, public_id, name, description, address, website, ror_id, avatar_url, is_published, creator_user_id, created_at) VALUES
  -- Полностью заполненная (высокий quality score)
  (1, '1f24535aec5153c23d987c84',
   'Московский государственный университет им. М.В. Ломоносова',
   'МГУ — ведущий классический университет России. Основан в 1755 году. Университет объединяет более 40 факультетов и 300 кафедр, обеспечивая фундаментальные и прикладные исследования мирового уровня в области физики, химии, биологии, математики и гуманитарных наук. Ежегодно публикуется свыше 10 000 научных работ в ведущих рецензируемых журналах.',
   'г. Москва, Ленинские горы, д. 1',
   'https://msu.ru',
   '010pmpe69',
   NULL, true, 2, NOW() - INTERVAL '120 days'),

  -- Хорошо заполненная
  (2, 'ae99485f0fa543bf17c197ef',
   'Санкт-Петербургский государственный университет',
   'СПбГУ — один из старейших университетов России, основанный в 1724 году. Университет осуществляет подготовку кадров и проведение научных исследований по широкому спектру естественных, гуманитарных и технических наук. Высокий рейтинг в международных системах QS и THE. Свыше 5 000 публикаций ежегодно.',
   'г. Санкт-Петербург, Университетская наб., д. 7/9',
   'https://spbu.ru',
   '02495e989',
   NULL, true, 3, NOW() - INTERVAL '90 days'),

  -- Средне заполненная (без website и ror)
  (3, '71e7f5b7df6d5993a3fdcede',
   'Московский физико-технический институт',
   'МФТИ — национальный исследовательский университет, один из ведущих технических вузов страны. Готовит специалистов в области теоретической и прикладной физики, математики, информатики и биоинженерии. Институт тесно связан с научными институтами РАН.',
   'г. Долгопрудный, Институтский пер., д. 9',
   NULL, NULL,
   NULL, true, 4, NOW() - INTERVAL '60 days'),

  -- Минимально заполненная (низкий quality score)
  (4, '9d1205ba7172c7d73f39faa8',
   'Новосибирский государственный университет',
   'НГУ расположен в Академгородке.',
   'г. Новосибирск, ул. Пирогова, д. 1',
   'https://nsu.ru',
   NULL,
   NULL, true, 5, NOW() - INTERVAL '45 days'),

  -- Без описания (минимальный quality)
  (5, '9cc34a1050b1f58ab30fc712',
   'Национальный исследовательский университет «Высшая школа экономики»',
   NULL,
   NULL,
   'https://hse.ru',
   NULL,
   NULL, true, 6, NOW() - INTERVAL '30 days')
ON CONFLICT DO NOTHING;

SELECT setval('organizations_id_seq', 5, true);

-- Привязка пользователей к организациям: без этого «мои» организации/лаборатории/вакансии не подтягиваются (get_organization_for_user смотрит user.organization_id)
UPDATE users SET organization_id = 1 WHERE id = 2;  -- ivanov@msu.ru  → МГУ
UPDATE users SET organization_id = 2 WHERE id = 3;  -- petrova@spbgu.ru → СПбГУ
UPDATE users SET organization_id = 3 WHERE id = 4;  -- sidorov@mipt.ru  → МФТИ
UPDATE users SET organization_id = 4 WHERE id = 5;  -- kuznetsova@nsu.ru → НГУ
UPDATE users SET organization_id = 5 WHERE id = 6;  -- volkov@hse.ru   → ВШЭ

-- =========================
--        EMPLOYEES
-- =========================

INSERT INTO employees (id, organization_id, creator_user_id, user_id, full_name, position, academic_degree, research_interests) VALUES
  -- МГУ employees
  (1,  1, 2, NULL, 'Сергеев Владимир Михайлович',   '["Профессор", "Заведующий кафедрой"]', 'д.ф.-м.н.', '["Квантовая физика", "Лазерная спектроскопия"]'),
  (2,  1, 2, NULL, 'Андреева Наталья Юрьевна',       '["Доцент"]',                           'к.х.н.',    '["Органическая химия", "Катализ"]'),
  (3,  1, 2, NULL, 'Белов Константин Сергеевич',      '["Старший научный сотрудник"]',         'к.ф.-м.н.', '["Наноматериалы", "Тонкие плёнки"]'),
  (4,  1, 2, NULL, 'Громова Елизавета Андреевна',     '["Младший научный сотрудник"]',         NULL,        '["Биоинформатика", "Геномика"]'),

  -- СПбГУ employees
  (5,  2, 3, NULL, 'Тимофеев Павел Алексеевич',       '["Профессор"]',                         'д.б.н.',    '["Молекулярная биология", "Протеомика"]'),
  (6,  2, 3, NULL, 'Захарова Ирина Сергеевна',        '["Доцент"]',                           'к.б.н.',    '["Генетика", "Эпигенетика"]'),
  (7,  2, 3, NULL, 'Орлов Максим Дмитриевич',         '["Научный сотрудник"]',                 'к.х.н.',    '["Аналитическая химия", "Масс-спектрометрия"]'),

  -- МФТИ employees
  (8,  3, 4, NULL, 'Калинин Роман Викторович',         '["Профессор", "Руководитель лаборатории"]', 'д.ф.-м.н.', '["Искусственный интеллект", "Машинное обучение"]'),
  (9,  3, 4, NULL, 'Жукова Анастасия Игоревна',       '["Инженер"]',                          NULL,        '["Робототехника", "Компьютерное зрение"]'),

  -- НГУ employees
  (10, 4, 5, NULL, 'Медведев Артём Олегович',          '["Доцент"]',                           'к.ф.-м.н.', '["Геофизика", "Сейсмология"]'),

  -- ВШЭ employees
  (11, 5, 6, NULL, 'Климова Дарья Алексеевна',         '["Исследователь"]',                    'к.э.н.',    '["Data Science", "Экономика инноваций"]')
ON CONFLICT DO NOTHING;

SELECT setval('employees_id_seq', 11, true);

-- =========================
--      LABORATORIES
-- =========================

  INSERT INTO laboratories_organizations (id, public_id, organization_id, creator_user_id, head_employee_id, name, description, activities, image_urls, is_published, created_at) VALUES
    -- МГУ labs (org 1, creator user 2)
    (1, '5170603e6277edf76a4fdf14', 1, 2, 1,
    'Лаборатория квантовой оптики и лазерной спектроскопии',
    'Лаборатория квантовой оптики и лазерной спектроскопии МГУ занимается фундаментальными и прикладными исследованиями в области квантовых технологий. Основные направления включают создание источников одиночных фотонов, квантовую криптографию, лазерную спектроскопию атомов и молекул. Лаборатория обладает уникальным парком оборудования стоимостью более 500 млн рублей.',
    'Квантовая криптография, лазерная диагностика, спектральный анализ, разработка фотонных сенсоров',
    '["https://example.com/lab1_1.jpg", "https://example.com/lab1_2.jpg", "https://example.com/lab1_3.jpg"]',
    true, NOW() - INTERVAL '110 days'),

    (2, 'ef859fc9b59a8bac93c24046', 1, 2, 3,
    'Лаборатория наноструктурированных материалов',
    'Лаборатория изучает свойства наноструктурированных материалов для применения в электронике, энергетике и медицине. Исследования включают синтез тонких плёнок, наночастиц и нанокомпозитов методами молекулярно-лучевой эпитаксии и химического осаждения.',
    'Синтез тонких плёнок, характеризация наноматериалов, электронная микроскопия',
    '["https://example.com/lab2_1.jpg"]',
    true, NOW() - INTERVAL '100 days'),

    -- СПбГУ labs (org 2, creator user 3)
    (3, '402dd3ff22f32fc839410472', 2, 3, 5,
    'Лаборатория молекулярной и клеточной биологии',
    'Лаборатория проводит исследования в области молекулярной биологии, протеомики и геномики. Ведущие направления: анализ структуры белков, разработка биомаркеров для ранней диагностики заболеваний, секвенирование нового поколения. Оснащена масс-спектрометрами высокого разрешения.',
    'Протеомика, секвенирование, разработка диагностических тест-систем',
    '["https://example.com/lab3_1.jpg", "https://example.com/lab3_2.jpg"]',
    true, NOW() - INTERVAL '85 days'),

    -- МФТИ lab (org 3, creator user 4)
    (4, 'e610cdec8b69e61ae1392dc9', 3, 4, 8,
    'Лаборатория интеллектуальных систем и робототехники',
    'Лаборатория специализируется на разработке систем искусственного интеллекта, компьютерного зрения и автономной робототехники. Созданные решения применяются в промышленности, медицине и транспорте.',
    'Разработка нейросетевых моделей, создание робототехнических платформ, компьютерное зрение',
    NULL,
    true, NOW() - INTERVAL '55 days'),

    -- Standalone labs (no organization at creation)
    (5, 'a058df9014932899043256aa', NULL, 7, NULL,
    'Лаборатория радиохимии и радиоэкологии',
    'Лаборатория занимается исследованием поведения радионуклидов в окружающей среде, разработкой методов радиохимического анализа и технологий обращения с радиоактивными отходами. Аккредитована для выполнения радиационного мониторинга.',
    'Радиохимический анализ, радиоэкологический мониторинг, дезактивация',
    '["https://example.com/lab5_1.jpg", "https://example.com/lab5_2.jpg"]',
    true, NOW() - INTERVAL '95 days'),

    (6, 'c5f02c3296d0333db0bcc4c5', NULL, 8, NULL,
    'Лаборатория ядерных реакций',
    'Лаборатория при ОИЯИ (Дубна) изучает реакции тяжёлых ионов и свойства сверхтяжёлых элементов. Является мировым лидером в синтезе новых элементов таблицы Менделеева.',
    'Синтез сверхтяжёлых элементов, ядерная спектроскопия',
    NULL,
    true, NOW() - INTERVAL '75 days'),

    -- Свежая lab (высокий freshness)
    (7, '8dd5e8b73eec08ab356b5891', NULL, 9, NULL,
    'Лаборатория фотоники и оптоинформатики',
    'Новая лаборатория ИТМО, фокусирующаяся на разработке фотонных интегральных схем и оптических вычислительных систем. Объединяет физиков, инженеров и программистов для создания устройств на основе света.',
    'Фотонные интегральные схемы, оптические вычисления, метаматериалы',
    '["https://example.com/lab7_1.jpg", "https://example.com/lab7_2.jpg", "https://example.com/lab7_3.jpg"]',
    true, NOW() - INTERVAL '5 days'),

    -- Неопубликованная (не должна попадать в выдачу)
    (8, '809c9f8e95d218ed26366dd2', 1, 2, NULL,
    'Лаборатория геоэкологии (черновик)',
    NULL,
    NULL,
    NULL,
    false, NOW() - INTERVAL '3 days')
  ON CONFLICT DO NOTHING;

  SELECT setval('laboratories_organizations_id_seq', 8, true);

-- =========================
--   EMPLOYEE ↔ LABORATORY
-- =========================

INSERT INTO employee_laboratories (employee_id, laboratory_id) VALUES
  (1, 1), (2, 1),
  (3, 2), (4, 2),
  (5, 3), (6, 3), (7, 3),
  (8, 4), (9, 4),
  (10, 1)
ON CONFLICT DO NOTHING;

-- =========================
--       EQUIPMENT
-- =========================

INSERT INTO equipment_organizations (id, organization_id, creator_user_id, name, description, characteristics) VALUES
  (1, 1, 2, 'Спектрометр Bruker VERTEX 80v',
   'Фурье-спектрометр высокого разрешения для ИК-спектроскопии',
   'Диапазон 15–28000 см⁻¹, разрешение 0.06 см⁻¹, вакуумная камера'),
  (2, 1, 2, 'Электронный микроскоп JEOL JEM-2100',
   'Просвечивающий электронный микроскоп для наноструктурных исследований',
   'Разрешение 0.23 нм, ускоряющее напряжение 80–200 кВ'),
  (3, 2, 3, 'Масс-спектрометр Thermo Orbitrap Exploris 480',
   'Высокоразрешающий масс-спектрометр для протеомных исследований',
   'Разрешение до 480K, масса/заряд до 8000'),
  (4, 3, 4, 'GPU-кластер NVIDIA DGX A100',
   'Вычислительный кластер для обучения нейросетей',
   '8× A100 80GB, NVLink, 320GB GPU RAM')
ON CONFLICT DO NOTHING;

SELECT setval('equipment_organizations_id_seq', 4, true);

-- =========================
--   EQUIPMENT ↔ LABORATORY
-- =========================

INSERT INTO laboratory_equipment (laboratory_id, equipment_id) VALUES
  (1, 1), (2, 2), (3, 3), (4, 4)
ON CONFLICT DO NOTHING;

-- =========================
--        VACANCIES
-- =========================

INSERT INTO vacancies_organizations (id, public_id, organization_id, creator_user_id, laboratory_id, name, requirements, description, employment_type, contact_email, is_published, created_at) VALUES
  -- МГУ vacancies (creator user 2 — paid)
  (1, '36419b15b591bc7b90609870', 1, 2, 1,
   'Младший научный сотрудник (квантовая оптика)',
   'Степень не ниже к.ф.-м.н. или аспирантура; опыт работы с лазерными системами; знание Python/MATLAB; публикации в рецензируемых журналах',
   'Участие в экспериментах по квантовой криптографии, настройка и юстировка оптических схем, обработка экспериментальных данных, подготовка публикаций и грантовых заявок',
   'Полная занятость',
   'hr-physics@msu.ru',
   true, NOW() - INTERVAL '5 days'),

  (2, '34dc62ad32be72284270747c', 1, 2, 2,
   'Инженер-исследователь (наноматериалы)',
   'Высшее техническое образование; опыт работы с методами характеризации; знание ПО для анализа данных',
   'Синтез и исследование наноструктурированных покрытий, подготовка образцов для электронной микроскопии',
   'Полная занятость',
   'nano-lab@msu.ru',
   true, NOW() - INTERVAL '15 days'),

  -- СПбГУ vacancy (creator user 3 — paid)
  (3, 'ab12cd34ef5678901234abcd', 2, 3, 3,
   'Постдок-исследователь (молекулярная биология)',
   'PhD в области биологии или смежных наук; опыт работы с NGS; публикации в Q1-журналах',
   'Проведение полногеномного секвенирования, анализ данных транскриптомики и протеомики, менторство аспирантов',
   'Полная занятость',
   'molbio@spbu.ru',
   true, NOW() - INTERVAL '3 days'),

  -- МФТИ vacancy (creator user 4 — free)
  (4, 'bc23de45fg6789012345bcde', 3, 4, 4,
   'ML-инженер (компьютерное зрение)',
   'Опыт с PyTorch/TensorFlow; знание архитектур CNN, Transformer; опыт деплоя моделей; Python',
   'Разработка и обучение моделей распознавания объектов, интеграция в робототехнические платформы, оптимизация инференса',
   'Полная занятость',
   'ai-lab@mipt.ru',
   true, NOW() - INTERVAL '8 days'),

  -- Standalone lab vacancy (creator user 7 — free)
  (5, 'cd34ef56gh7890123456cdef', NULL, 7, 5,
   'Лаборант-радиохимик',
   'Высшее химическое образование; допуск к работе с радиоактивными материалами; знание методов альфа/бета/гамма-спектрометрии',
   'Выполнение радиохимических анализов проб окружающей среды, калибровка измерительного оборудования',
   'Полная занятость',
   'radiochem@ras.ru',
   true, NOW() - INTERVAL '25 days'),

  -- Paid lab vacancy (creator user 8 — paid)
  (6, 'de45fg67hi8901234567defg', NULL, 8, 6,
   'Физик-ядерщик (синтез элементов)',
   'Степень к.ф.-м.н.; опыт работы на циклотронах; знание GEANT4',
   'Участие в экспериментах по синтезу сверхтяжёлых элементов, разработка мишеней, моделирование процессов',
   'Полная занятость',
   'nuclear@jinr.ru',
   true, NOW() - INTERVAL '40 days'),

  -- Old vacancy (low freshness)
  (7, 'ef56gh78ij9012345678efgh', 4, 5, NULL,
   'Стажёр-геофизик',
   'Студент старших курсов или аспирант',
   'Участие в полевых экспедициях',
   'Стажировка',
   NULL,
   true, NOW() - INTERVAL '90 days'),

  -- Unpublished vacancy
  (8, 'fg67hi89jk0123456789fghi', 5, 6, NULL,
   'Data Scientist (черновик)',
   NULL, NULL, NULL, NULL,
   false, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

SELECT setval('vacancies_organizations_id_seq', 8, true);

-- =========================
--     ORG QUERIES (REQUESTS)
-- =========================

INSERT INTO organization_queries (id, public_id, organization_id, creator_user_id, title, task_description, completed_examples, grant_info, budget, deadline, status, is_published, created_at) VALUES
  -- МГУ queries (creator user 2 — paid)
  (1, 'q1a2b3c4d5e6f7a8b9c0d1e2', 1, 2,
   'Разработка квантового генератора случайных чисел',
   'Необходимо разработать прототип квантового генератора случайных чисел на основе вакуумных флуктуаций для криптографических приложений. Требуется обеспечить скорость генерации не менее 1 Гбит/с.',
   'Создан лабораторный прототип со скоростью 100 Мбит/с',
   'Грант РНФ 24-12-00XXX',
   '12 000 000 ₽',
   'Декабрь 2026',
   'active',
   true, NOW() - INTERVAL '10 days'),

  -- СПбГУ query (creator user 3 — paid)
  (2, 'q2b3c4d5e6f7a8b9c0d1e2f3', 2, 3,
   'Поиск биомаркеров нейродегенеративных заболеваний',
   'Необходимо выполнить протеомный анализ образцов спинномозговой жидкости пациентов с болезнью Альцгеймера и здоровых добровольцев для выявления дифференциально экспрессируемых белков.',
   NULL,
   'Грант РФФИ',
   '8 500 000 ₽',
   'Июнь 2027',
   'active',
   true, NOW() - INTERVAL '7 days'),

  -- МФТИ query (creator user 4 — free)
  (3, 'q3c4d5e6f7a8b9c0d1e2f3a4', 3, 4,
   'Разработка системы автономной навигации БПЛА',
   'Создание модуля визуальной одометрии и планирования маршрута для БПЛА в условиях отсутствия GPS-сигнала. Требуется работа в реальном времени на embedded-платформах.',
   'Прототип visual SLAM на Jetson NX',
   NULL,
   '5 000 000 ₽',
   'Март 2027',
   'active',
   true, NOW() - INTERVAL '20 days'),

  -- Minimal query (low quality score)
  (4, 'q4d5e6f7a8b9c0d1e2f3a4b5', 4, 5,
   'Анализ сейсмических данных',
   'Обработка данных сейсмических станций',
   NULL, NULL, NULL, NULL,
   'active',
   true, NOW() - INTERVAL '50 days'),

  -- Standalone lab query (creator user 8 — paid)
  (5, 'q5e6f7a8b9c0d1e2f3a4b5c6', NULL, 8,
   'Разработка метода определения актинидов в почве',
   'Необходимо создать экспрессный метод определения содержания плутония-239 и америция-241 в почвенных пробах с использованием альфа-спектрометрии.',
   'Отработана методика для урана на модельных образцах',
   'Госконтракт Росатом',
   '15 000 000 ₽',
   'Сентябрь 2027',
   'active',
   true, NOW() - INTERVAL '12 days')
ON CONFLICT DO NOTHING;

SELECT setval('organization_queries_id_seq', 5, true);

-- =========================
--  QUERY ↔ LABORATORY
-- =========================

INSERT INTO query_laboratories (query_id, laboratory_id) VALUES
  (1, 1),
  (2, 3),
  (3, 4),
  (5, 6)
ON CONFLICT DO NOTHING;

-- =========================
--       RESEARCHERS
-- =========================

INSERT INTO researchers (id, user_id, full_name, position, academic_degree, research_interests, job_search_status, is_published, created_at) VALUES
  (1, 10, 'Фёдоров Николай Андреевич',  'Старший научный сотрудник', 'к.ф.-м.н.',
   '["Квантовая механика", "Теория поля", "Математическая физика"]',
   'open_to_offers', true, NOW() - INTERVAL '70 days'),

  (2, 11, 'Егорова Татьяна Сергеевна',  'Научный сотрудник', 'к.х.н.',
   '["Органический синтез", "Каталитические реакции", "Зелёная химия"]',
   'actively_searching', true, NOW() - INTERVAL '55 days'),

  (3, 12, 'Козлов Виктор Павлович',     'Постдок', NULL,
   '["Биоинформатика", "Структурная биология", "Молекулярная динамика"]',
   'open_to_offers', true, NOW() - INTERVAL '40 days')
ON CONFLICT DO NOTHING;

SELECT setval('researchers_id_seq', 3, true);

-- =========================
--        STUDENTS
-- =========================

INSERT INTO students (id, user_id, full_name, status, skills, summary, is_published, created_at) VALUES
  (1, 13, 'Смирнов Артём Олегович', 'Аспирант 2 года',
   '["Python", "Machine Learning", "PyTorch", "OpenCV"]',
   'Исследую методы обнаружения объектов в условиях низкой видимости. Ищу стажировку в лаборатории робототехники.',
   true, NOW() - INTERVAL '35 days'),

  (2, 14, 'Лебедева Дарья Максимовна', 'Магистрант 1 года',
   '["R", "Bioinformatics", "NGS Analysis", "Python"]',
   'Интересуюсь транскриптомикой и разработкой пайплайнов для анализа данных секвенирования.',
   true, NOW() - INTERVAL '25 days'),

  (3, 15, 'Попов Кирилл Александрович', 'Бакалавр 4 курса',
   '["C++", "MATLAB", "Физика твёрдого тела"]',
   'Ищу возможности для выполнения ВКР в лаборатории наноматериалов.',
   true, NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;

SELECT setval('students_id_seq', 3, true);

-- =========================
--    USER SUBSCRIPTIONS
-- =========================
-- Pro active:     user 2 (МГУ), user 8 (ОИЯИ lab, loyalty discount)
-- Basic active:   user 3 (СПбГУ) — ограничение 3 standalone labs
-- Trial active:   user 4 (МФТИ) — trial_ends_at +14 дней
-- Expired:        user 5 (НГУ)
-- Cancelled:      user 6 (ВШЭ)
-- Free:           user 7, 9

INSERT INTO user_subscriptions (id, user_id, audience, tier, status, started_at, expires_at, trial_ends_at, discount_percent, renewal_count, activated_by, created_at) VALUES
  -- Активная Pro без срока (бессрочная)
  (1, 2, 'representative', 'pro', 'active', NOW() - INTERVAL '30 days', NULL, NULL, NULL, 0, 1, NOW() - INTERVAL '30 days'),

  -- Basic: 1 org, ограничение до 3 standalone labs (user 3 — СПбГУ)
  (2, 3, 'representative', 'basic', 'active', NOW() - INTERVAL '15 days', '2026-12-31 23:59:59+00', NULL, NULL, 0, 1, NOW() - INTERVAL '15 days'),

  -- Pro + loyalty: renewal_count=2, discount (user 8 — ОИЯИ lab)
  (3, 8, 'representative', 'pro', 'active', NOW() - INTERVAL '10 days', '2027-03-31 23:59:59+00', NULL, 10, 2, 1, NOW() - INTERVAL '10 days'),

  -- Trial: active 14 дней (user 4 — МФТИ) — paid за счёт trial_ends_at
  (6, 4, 'representative', 'pro', 'active', NOW(), NULL, NOW() + INTERVAL '14 days', NULL, 0, 1, NOW()),

  -- Истёкшая подписка (user 5 — НГУ)
  (4, 5, 'representative', 'pro', 'expired', NOW() - INTERVAL '60 days', NOW() - INTERVAL '1 day', NULL, NULL, 0, 1, NOW() - INTERVAL '60 days'),

  -- Отменённая подписка (user 6 — ВШЭ)
  (5, 6, 'representative', 'pro', 'cancelled', NOW() - INTERVAL '20 days', NOW() + INTERVAL '30 days', NULL, NULL, 0, 1, NOW() - INTERVAL '20 days')
ON CONFLICT (id) DO UPDATE SET
  tier = EXCLUDED.tier,
  trial_ends_at = EXCLUDED.trial_ends_at,
  discount_percent = EXCLUDED.discount_percent,
  renewal_count = EXCLUDED.renewal_count;

SELECT setval('user_subscriptions_id_seq', 6, true);

-- =========================
--   SUBSCRIPTION EVENTS
-- =========================

INSERT INTO subscription_events (id, subscription_id, event_type, performed_by, details, created_at) VALUES
  (1, 1, 'activated', 1, '{"audience": "representative", "note": "Первый платный партнёр"}', NOW() - INTERVAL '30 days'),
  (2, 2, 'activated', 1, '{"audience": "representative"}', NOW() - INTERVAL '15 days'),
  (3, 3, 'activated', 1, '{"audience": "representative"}', NOW() - INTERVAL '10 days'),
  (4, 4, 'activated', 1, '{"audience": "representative"}', NOW() - INTERVAL '60 days'),
  (5, 4, 'expired',   1, '{"reason": "auto"}', NOW() - INTERVAL '1 day'),
  (6, 5, 'activated', 1, '{"audience": "representative"}', NOW() - INTERVAL '20 days'),
  (7, 5, 'cancelled', 1, '{"reason": "requested by user"}', NOW() - INTERVAL '5 days'),
  (8, 6, 'activated', 1, '{"audience": "representative", "trial": true}', NOW())
ON CONFLICT DO NOTHING;

SELECT setval('subscription_events_id_seq', 8, true);

-- =========================
--    ANALYTICS EVENTS
--  (для performance score)
-- =========================

INSERT INTO analytics_events (event_type, user_id, session_id, entity_type, entity_id, payload, created_at) VALUES
  -- Просмотры организации МГУ (высокая посещаемость)
  ('page_view', NULL, 'sess_001', 'organization', '1f24535aec5153c23d987c84', '{"referrer": "search"}', NOW() - INTERVAL '5 days'),
  ('page_view', NULL, 'sess_002', 'organization', '1f24535aec5153c23d987c84', '{"referrer": "catalog"}', NOW() - INTERVAL '4 days'),
  ('page_view', NULL, 'sess_003', 'organization', '1f24535aec5153c23d987c84', '{"referrer": "home"}', NOW() - INTERVAL '3 days'),
  ('page_view', NULL, 'sess_004', 'organization', '1f24535aec5153c23d987c84', NULL, NOW() - INTERVAL '2 days'),
  ('page_view', NULL, 'sess_005', 'organization', '1f24535aec5153c23d987c84', NULL, NOW() - INTERVAL '1 day'),
  ('page_leave', NULL, 'sess_001', 'organization', '1f24535aec5153c23d987c84', '{"time_spent_sec": 120}', NOW() - INTERVAL '5 days'),
  ('page_leave', NULL, 'sess_002', 'organization', '1f24535aec5153c23d987c84', '{"time_spent_sec": 85}', NOW() - INTERVAL '4 days'),
  ('page_leave', NULL, 'sess_003', 'organization', '1f24535aec5153c23d987c84', '{"time_spent_sec": 200}', NOW() - INTERVAL '3 days'),

  -- Просмотры лаборатории квантовой оптики
  ('page_view', NULL, 'sess_006', 'laboratory', '5170603e6277edf76a4fdf14', NULL, NOW() - INTERVAL '3 days'),
  ('page_view', NULL, 'sess_007', 'laboratory', '5170603e6277edf76a4fdf14', NULL, NOW() - INTERVAL '2 days'),
  ('page_view', NULL, 'sess_008', 'laboratory', '5170603e6277edf76a4fdf14', NULL, NOW() - INTERVAL '1 day'),
  ('page_leave', NULL, 'sess_006', 'laboratory', '5170603e6277edf76a4fdf14', '{"time_spent_sec": 150}', NOW() - INTERVAL '3 days'),
  ('button_click', 13, 'sess_009', 'laboratory', '5170603e6277edf76a4fdf14', '{"button": "contact"}', NOW() - INTERVAL '2 days'),

  -- Просмотры вакансии ML-инженер (популярная)
  ('page_view', 13, 'sess_010', 'vacancy', 'bc23de45fg6789012345bcde', NULL, NOW() - INTERVAL '6 days'),
  ('page_view', 14, 'sess_011', 'vacancy', 'bc23de45fg6789012345bcde', NULL, NOW() - INTERVAL '5 days'),
  ('page_view', 15, 'sess_012', 'vacancy', 'bc23de45fg6789012345bcde', NULL, NOW() - INTERVAL '4 days'),
  ('page_view', NULL, 'sess_013', 'vacancy', 'bc23de45fg6789012345bcde', NULL, NOW() - INTERVAL '3 days'),
  ('page_leave', 13, 'sess_010', 'vacancy', 'bc23de45fg6789012345bcde', '{"time_spent_sec": 90}', NOW() - INTERVAL '6 days'),
  ('button_click', 13, 'sess_010', 'vacancy', 'bc23de45fg6789012345bcde', '{"button": "respond"}', NOW() - INTERVAL '6 days'),

  -- Просмотры запроса по квантовому генератору
  ('page_view', NULL, 'sess_014', 'query', 'q1a2b3c4d5e6f7a8b9c0d1e2', NULL, NOW() - INTERVAL '8 days'),
  ('page_view', 10, 'sess_015', 'query', 'q1a2b3c4d5e6f7a8b9c0d1e2', NULL, NOW() - INTERVAL '5 days'),
  ('page_leave', 10, 'sess_015', 'query', 'q1a2b3c4d5e6f7a8b9c0d1e2', '{"time_spent_sec": 180}', NOW() - INTERVAL '5 days'),

  -- Минимум просмотров для НГУ (низкая performance)
  ('page_view', NULL, 'sess_016', 'organization', '9d1205ba7172c7d73f39faa8', NULL, NOW() - INTERVAL '20 days')
;

-- =========================
--    VACANCY RESPONSES
-- =========================

INSERT INTO vacancy_responses (user_id, vacancy_id, status, created_at) VALUES
  (13, 4, 'new',      NOW() - INTERVAL '5 days'),
  (14, 3, 'new',      NOW() - INTERVAL '4 days'),
  (15, 1, 'reviewed', NOW() - INTERVAL '3 days'),
  (13, 1, 'new',      NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

COMMIT;

-- ==========================================================
-- Summary:
--   Users:          15 (1 admin, 5 lab_admin, 3 lab_rep, 3 researcher, 3 student)
--   Organizations:  5  (varying completeness for ranking tests)
--   Laboratories:   8  (5 org-linked, 3 standalone, 1 draft)
--   Employees:      11
--   Equipment:      4
--   Vacancies:      8  (7 published, 1 draft)
--   Queries:        5
--   Subscriptions:  6  (Pro: 2,8; Basic: 3; Trial: 4; expired: 5; cancelled: 6)
--   Analytics:      22 events
--
-- Paid:  2 (Pro), 3 (Basic), 4 (Trial), 8 (Pro+loyalty)
-- Free:  5 (expired), 6 (cancelled), 7, 9
--
-- Test password for all users: Test1234
-- Admin login: admin@sintezum.ru / Test1234
-- ==========================================================
