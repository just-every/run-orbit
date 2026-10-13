import {editorLeaf} from "../editor/leaf";
import {useState} from 'react';
import {createFileRoute} from '@tanstack/react-router';
import {publicProductConfig} from '../core/app/mounts/public-config';
import {SiteHeader} from '../core/features/public/ui/home/SiteHeader';
import {SiteFooter} from '../core/features/public/ui/home/SiteFooter';
import {DemoOpportunities} from '../core/features/public/ui/demo-opportunities';
import {DemoSelected} from '../core/features/public/ui/demo-selected';
import {demoStory} from '../core/features/public/demo-story';
function DemoPage(){
 const story=Route.useLoaderData(),[index,setIndex]=useState(0),{name,imageUrl,showPoweredByCredit}=publicProductConfig;
 return <div className="ob-site"><SiteHeader name={name} imageUrl={imageUrl}/><main className="demo-story"><section aria-labelledby="page-title"><p className="eyebrow">Read-only demo</p><h1 id="page-title">See the evidence behind a next action.</h1><p className="intro">Explore twelve fictional customer opportunities, with the full context, value and timing,<br/> plus the latest evidence and a suggested follow-up.</p></section><aside className="notice" role="note"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M8 7v4" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="4.6" r=".9" fill="currentColor"/></svg><p>This is a <strong>read-only demo.</strong> The twelve fictional opportunities never enter your workspace. Nothing here sends mail or calls AI.</p></aside><div className="workspace"><DemoOpportunities deals={story.deals} index={index} onSelect={setIndex}/><DemoSelected deal={story.deals[index]!} now={story.generatedAt}/></div></main><SiteFooter name={name} imageUrl={imageUrl} showCredit={showPoweredByCredit}/></div>;
}
export const Route=createFileRoute('/demo')({loader:()=>demoStory(),component:editorLeaf(DemoPage)});
