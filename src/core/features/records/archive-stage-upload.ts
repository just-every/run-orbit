import {decodeArchiveCell,isEncodedArchiveCell} from './archive-binary';
import type { ArchivePart, ArchiveTable } from './archive-schema';
import { stageName } from './archive-storage';
import { stageLayouts, stageCell } from './archive-stage-layout';
/** The ordinal uses hidden rowid; a 100-column record is inserted in one atomic head/tail batch. */
export async function uploadStatements(db: D1Database, id: string, part: ArchivePart, catalog: ArchiveTable[], binary=false) {
    const statements: D1PreparedStatement[] = [], layouts = await stageLayouts(db, catalog);
    for (const name of new Set(part.records.map(r => r.table))) {
        const columns = catalog.find(t => t.name === name)!.columns.map(c => c.name), table = stageName(id, name), layout = layouts.get(name)!;
        const head = columns.slice(0, 99), tail = columns.slice(99), cell = (name: string) => stageCell(layout, name);
        let buffer: string[] = [], bytes = 2;
        const flush = () => {
            if (!buffer.length) return;
            const json = `[${buffer.join(',')}]`;
            statements.push(db.prepare(`INSERT INTO ${table}(rowid,${head.map(cell).join(',')}) SELECT json_extract(value,'$.index'),${head.map(c => `json_extract(value,'$.row.${c}')`).join(',')} FROM json_each(?)`).bind(json));
            for (const column of tail) statements.push(db.prepare(`WITH incoming AS (SELECT json_extract(value,'$.index') AS ordinal,json_extract(value,'$.row.${column}') AS cell FROM json_each(?)) UPDATE ${table} SET ${cell(column)}=(SELECT cell FROM incoming WHERE ordinal=${table}.rowid) WHERE rowid IN(SELECT ordinal FROM incoming)`).bind(json));
            buffer = []; bytes = 2;
        };
        for (const record of part.records.filter(r => r.table === name)) {
            const encoded = JSON.stringify(record), length = new TextEncoder().encode(encoded).length;
            if (length > 1048000 || binary && columns.some(c=>isEncodedArchiveCell(record.row[c]))) {
                flush();
                const values=new Map(columns.map(column=>[column,binary?decodeArchiveCell(record.row[column]):record.row[column]]));
                const large=new Set(columns.filter(column=>{const value=values.get(column);return value instanceof ArrayBuffer?value.byteLength>800000:typeof value==='string'&&new TextEncoder().encode(value).length>800000;}));
                statements.push(db.prepare(`INSERT INTO ${table}(rowid,${head.map(cell).join(',')}) VALUES(?,${head.map(() => '?').join(',')})`).bind(record.index, ...head.map(c => large.has(c)?null:values.get(c)!)));
                for (const column of tail) statements.push(db.prepare(`UPDATE ${table} SET ${cell(column)}=? WHERE rowid=?`).bind(large.has(column)?null:values.get(column)!, record.index));
                for(const column of large){const value=values.get(column)!;if(value instanceof ArrayBuffer){const bytes=new Uint8Array(value);for(let offset=0;offset<bytes.length;offset+=500000)statements.push(db.prepare(`UPDATE ${table} SET ${cell(column)}=CAST(COALESCE(${cell(column)},x'')||? AS BLOB) WHERE rowid=?`).bind(bytes.slice(offset,offset+500000).buffer,record.index));}else{const text=value as string;for(let offset=0;offset<text.length;){let end=Math.min(offset+200000,text.length);if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]!))end--;statements.push(db.prepare(`UPDATE ${table} SET ${cell(column)}=COALESCE(${cell(column)},'')||? WHERE rowid=?`).bind(text.slice(offset,end),record.index));offset=end;}}}

            } else {
                if (bytes + length + 1 > 1048000) flush();
                buffer.push(encoded); bytes += length + 1;
            }
        }
        flush();
    }
    return statements;
}
