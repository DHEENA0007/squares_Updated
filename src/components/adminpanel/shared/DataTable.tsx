import { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { Link } from "react-router-dom";

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onEdit?: (item: T) => void;
  editPath?: (item: T & { id: string }) => string;
}

export function DataTable<T extends { id: string }>({ 
  columns, 
  data, 
  onEdit, 
  editPath 
}: DataTableProps<T>) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((column) => (
              <TableHead key={column.key} className="font-semibold">
                {column.label}
              </TableHead>
            ))}
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="text-center py-8 text-muted-foreground">
                No data found
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => (
              <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render ? column.render(item) : (item as any)[column.key]}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  {editPath ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <Link to={editPath(item)}>
                        <Edit className="w-4 h-4" />
                        <span className="ml-2">Edit</span>
                      </Link>
                    </Button>
                  ) : onEdit ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(item)}
                    >
                      <Edit className="w-4 h-4" />
                      <span className="ml-2">Edit</span>
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
