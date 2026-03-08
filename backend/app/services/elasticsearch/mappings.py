"""
Маппинги индексов Elasticsearch.
"""

VACANCIES_INDEX_MAPPING = {
    "settings": {"number_of_replicas": 0},
    "mappings": {
        "properties": {
            "id": {"type": "integer"},
            "public_id": {"type": "keyword"},
            "name": {"type": "text", "analyzer": "standard"},
            "requirements": {"type": "text", "analyzer": "standard"},
            "description": {"type": "text", "analyzer": "standard"},
            "employment_type": {"type": "text", "analyzer": "standard", "fields": {"keyword": {"type": "keyword"}}},
            "organization_name": {"type": "text", "analyzer": "standard"},
            "laboratory_name": {"type": "text", "analyzer": "standard"},
            "organization_id": {"type": "integer"},
            "laboratory_id": {"type": "integer"},
            "organization_public_id": {"type": "keyword"},
            "laboratory_public_id": {"type": "keyword"},
            "laboratory_created_at": {"type": "date"},
            "organization_avatar_url": {"type": "keyword", "index": False},
            "is_published": {"type": "boolean"},
            "created_at": {"type": "date"},
            "paid_active": {"type": "boolean"},
            "rank_score": {"type": "float"},
            "creator_user_id": {"type": "integer"},
            "name_suggest": {
                "type": "completion",
                "analyzer": "simple",
                "preserve_separators": True,
                "max_input_length": 50,
            },
            "organization_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "laboratory_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "employment_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 30},
            "public_id_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
        }
    }
}

LABORATORIES_INDEX_MAPPING = {
    "settings": {"number_of_replicas": 0},
    "mappings": {
        "properties": {
            "id": {"type": "integer"},
            "public_id": {"type": "keyword"},
            "name": {"type": "text", "analyzer": "standard"},
            "description": {"type": "text", "analyzer": "standard"},
            "activities": {"type": "text", "analyzer": "standard"},
            "organization_name": {"type": "text", "analyzer": "standard"},
            "organization_id": {"type": "integer"},
            "organization_public_id": {"type": "keyword"},
            "organization_avatar_url": {"type": "keyword", "index": False},
            "employee_names": {"type": "text", "analyzer": "standard"},
            "equipment_names": {"type": "text", "analyzer": "standard"},
            "equipment_descriptions": {"type": "text", "analyzer": "standard"},
            "employees_count": {"type": "integer"},
            "has_organization": {"type": "boolean"},
            "is_published": {"type": "boolean"},
            "created_at": {"type": "date"},
            "paid_active": {"type": "boolean"},
            "rank_score": {"type": "float"},
            "creator_user_id": {"type": "integer"},
            "name_suggest": {
                "type": "completion",
                "analyzer": "simple",
                "preserve_separators": True,
                "max_input_length": 50,
            },
            "organization_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "employee_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "equipment_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "public_id_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
        }
    }
}

QUERIES_INDEX_MAPPING = {
    "settings": {"number_of_replicas": 0},
    "mappings": {
        "properties": {
            "id": {"type": "integer"},
            "public_id": {"type": "keyword"},
            "title": {"type": "text", "analyzer": "standard"},
            "task_description": {"type": "text", "analyzer": "standard"},
            "completed_examples": {"type": "text", "analyzer": "standard"},
            "grant_info": {"type": "text", "analyzer": "standard"},
            "budget": {"type": "keyword"},
            "deadline": {"type": "keyword"},
            "status": {"type": "text", "analyzer": "standard", "fields": {"keyword": {"type": "keyword"}}},
            "organization_name": {"type": "text", "analyzer": "standard"},
            "organization_id": {"type": "integer"},
            "organization_public_id": {"type": "keyword"},
            "organization_avatar_url": {"type": "keyword", "index": False},
            "laboratory_ids": {"type": "integer"},
            "deadline_year": {"type": "integer"},
            "is_published": {"type": "boolean"},
            "created_at": {"type": "date"},
            "paid_active": {"type": "boolean"},
            "rank_score": {"type": "float"},
            "creator_user_id": {"type": "integer"},
            "title_suggest": {
                "type": "completion",
                "analyzer": "simple",
                "preserve_separators": True,
                "max_input_length": 50,
            },
            "organization_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "status_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 30},
            "public_id_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
        }
    }
}

APPLICANTS_INDEX_MAPPING = {
    "settings": {"number_of_replicas": 0},
    "mappings": {
        "properties": {
            "id": {"type": "integer"},
            "public_id": {"type": "keyword"},
            "user_id": {"type": "integer"},
            "role": {"type": "keyword"},
            "full_name": {"type": "text", "analyzer": "standard"},
            "status": {"type": "text", "analyzer": "standard", "fields": {"keyword": {"type": "keyword"}}},
            "education_text": {"type": "text", "analyzer": "standard"},
            "skills_text": {"type": "text", "analyzer": "standard"},
            "research_interests_text": {"type": "text", "analyzer": "standard"},
            "summary": {"type": "text", "analyzer": "standard"},
            "position": {"type": "text", "analyzer": "standard"},
            "job_search_status": {"type": "keyword"},
            "employment_type_preference": {"type": "text", "analyzer": "standard"},
            "photo_url": {"type": "keyword", "index": False},
            "created_at": {"type": "date"},
            "full_name_suggest": {
                "type": "completion",
                "analyzer": "simple",
                "preserve_separators": True,
                "max_input_length": 50,
            },
            "skills_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "research_interests_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "position_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "status_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 30},
            "public_id_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
        }
    }
}

ORGANIZATIONS_INDEX_MAPPING = {
    "settings": {"number_of_replicas": 0},
    "mappings": {
        "properties": {
            "id": {"type": "integer"},
            "public_id": {"type": "keyword"},
            "name": {"type": "text", "analyzer": "standard"},
            "description": {"type": "text", "analyzer": "standard"},
            "ror_id": {"type": "text", "analyzer": "standard"},
            "laboratory_names": {"type": "text", "analyzer": "standard"},
            "employee_names": {"type": "text", "analyzer": "standard"},
            "equipment_names": {"type": "text", "analyzer": "standard"},
            "laboratories_count": {"type": "integer"},
            "employees_count": {"type": "integer"},
            "avatar_url": {"type": "keyword", "index": False},
            "is_published": {"type": "boolean"},
            "created_at": {"type": "date"},
            "paid_active": {"type": "boolean"},
            "rank_score": {"type": "float"},
            "creator_user_id": {"type": "integer"},
            "name_suggest": {
                "type": "completion",
                "analyzer": "simple",
                "preserve_separators": True,
                "max_input_length": 50,
            },
            "laboratory_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "employee_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "equipment_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
            "ror_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 30},
            "public_id_suggest": {"type": "completion", "analyzer": "simple", "max_input_length": 50},
        }
    }
}
