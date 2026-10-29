import {CaptureSettings} from '../capture-page';
import {useHashMap} from '../hash-target';
import {SourcesSettings} from '../sources-page';
import {SettingsArea} from './area';

// Old Capture and Sources links named an item to review by hash; those items are on Review now.
const reviewItem=(hash:string)=>/^(?:unlinked|reply|proposal)-[A-Za-z0-9_-]{1,100}$/.test(hash)?`/app/review#${hash}`:null;

/** Settings › Capture: the mail and meetings Orbit reads, and the website and app events it receives. */
export function CaptureArea(){
 useHashMap(reviewItem);
 return <SettingsArea title="Capture"><CaptureSettings/><SourcesSettings/></SettingsArea>;
}
