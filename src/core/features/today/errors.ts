export class TodayError extends Error {constructor(readonly status:400|404|409,message:string){super(message);}}
