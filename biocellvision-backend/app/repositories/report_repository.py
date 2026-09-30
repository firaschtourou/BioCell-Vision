# app/repositories/report_repository.py
from typing import Optional, List

from app.models.report_model import Report
from app.utils.database import db


class ReportRepository:
    async def create_report(
        self,
        analyse_id: int,
        biologist_id: int,
        generated_by_admin_id: Optional[int],
        report_name: str,
        file_path: str,
        status: str = "generated",
        comment: Optional[str] = None
    ) -> Report:
        query = """
            INSERT INTO reports (
                analyse_id,
                biologist_id,
                generated_by_admin_id,
                report_name,
                file_path,
                status,
                comment
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, analyse_id, biologist_id, generated_by_admin_id,
                      report_name, file_path, status, comment, created_at
        """
        row = await db.fetch_one(
            query,
            analyse_id,
            biologist_id,
            generated_by_admin_id,
            report_name,
            file_path,
            status,
            comment
        )
        return Report.from_dict(dict(row))

    async def get_by_id(self, report_id: int) -> Optional[Report]:
        query = """
            SELECT id, analyse_id, biologist_id, generated_by_admin_id,
                   report_name, file_path, status, comment, created_at
            FROM reports
            WHERE id = $1
        """
        row = await db.fetch_one(query, report_id)
        return Report.from_dict(dict(row)) if row else None

    async def get_latest_by_analyse_id(self, analyse_id: int) -> Optional[Report]:
        query = """
            SELECT id, analyse_id, biologist_id, generated_by_admin_id,
                   report_name, file_path, status, comment, created_at
            FROM reports
            WHERE analyse_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        """
        row = await db.fetch_one(query, analyse_id)
        return Report.from_dict(dict(row)) if row else None

    async def get_reports_by_biologist(self, biologist_id: int) -> List[Report]:
        query = """
            SELECT id, analyse_id, biologist_id, generated_by_admin_id,
                   report_name, file_path, status, comment, created_at
            FROM reports
            WHERE biologist_id = $1
            ORDER BY created_at DESC
        """
        rows = await db.fetch_all(query, biologist_id)
        return [Report.from_dict(dict(row)) for row in rows]

    async def delete_report(self, report_id: int) -> bool:
        query = "DELETE FROM reports WHERE id = $1"
        result = await db.execute(query, report_id)
        return result is not None
        

report_repository = ReportRepository()
