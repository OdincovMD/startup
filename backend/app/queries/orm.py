"""
Композитный Orm — объединяет Core, Student, Researcher, Representative (async).
"""

from app.core.queries.orm import Orm as CoreOrm
from app.roles.student.queries.orm import Orm as StudentOrm
from app.roles.researcher.queries.orm import Orm as ResearcherOrm
from app.roles.representative.queries.orm import Orm as RepresentativeOrm


class Orm(CoreOrm, StudentOrm, ResearcherOrm, RepresentativeOrm):
    pass
