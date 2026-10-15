/** Source connection checks are receipts, never customer evidence. */
export const isTestEvent=(event:{data?:Record<string,unknown>})=>event.data?.test===true;

/** Also excludes tests recorded by earlier releases, which linked them to deals. */
export const customerSignalSql=(alias='s')=>`COALESCE(json_type(${alias}.payload_json,'$.data.test'),'null')<>'true'`;
