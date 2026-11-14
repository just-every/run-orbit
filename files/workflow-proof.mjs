import {withOperatorWorkspace} from '../tests/rer/operator-workspace.mjs';
import {workflowBrowserJourney} from '../tests/rer/workflow-journey.mjs';
await withOperatorWorkspace({name:'workflow-continuation',widths:[1440]},context=>workflowBrowserJourney(context,1440));
console.log('Native workflow journey passed, including visible Undo summary and restored title.');
