import { Response } from "express";
import * as XLSX from "xlsx";

/**
 * Exporte un tableau de données en fichier XLSX et l'envoie en réponse HTTP.
 */
export function exportToXlsx(res: Response, data: Record<string, unknown>[], sheetName: string, filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Auto-width columns
  if (data.length > 0) {
    const colWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.max(key.length, ...data.map((row) => String(row[key] ?? "").length)),
    }));
    ws["!cols"] = colWidths;
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  res.send(Buffer.from(buffer));
}
