/** A route's unexpected failure answers with a generic message; its cause still reaches the Worker log, so a 500 can be explained. */
export function logUnexpected(scope:string,error:unknown){
 const cause=error instanceof Error&&error.cause!==undefined?` (cause: ${error.cause instanceof Error?`${error.cause.name}: ${error.cause.message}`:String(error.cause)})`:'';
 console.error(`Orbit ${scope}: unexpected ${error instanceof Error?`${error.name}: ${error.message}`:String(error)}${cause}`);
}
