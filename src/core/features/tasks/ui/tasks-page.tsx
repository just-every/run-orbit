import {Outlet,useParams} from '@tanstack/react-router';
import {OperatorShell} from '../../operator/ui/operator-shell';
import {SalesTasks} from '../../operator/ui/sales-tasks';

/** Tasks: the operator's sales tasks; a chosen task opens in place at /app/tasks/<id>. */
export function TasksPage(){
 const {id}=useParams({strict:false}) as {id?:string};
 return <OperatorShell title="Tasks"><SalesTasks openId={id}/><Outlet/></OperatorShell>;
}
