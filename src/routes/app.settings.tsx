import { editorLeaf } from "../editor/leaf";
import {createFileRoute} from '@tanstack/react-router';
import {SettingsPage} from '../core/features/operator/ui/settings-page';
import {ScrollToHash} from '../core/features/operator/ui/hash-target';
export const Route=createFileRoute('/app/settings')({component: editorLeaf(SettingsRoute)});
function SettingsRoute(){return <><SettingsPage/><ScrollToHash ready/></>;}
