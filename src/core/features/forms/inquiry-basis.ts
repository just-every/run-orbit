import {escapeHtml} from '../content/model';
/** An inquiry-only form discloses this on its page; the same words are stored with each request that page accepts. */
export const inquiryBasisWording='We will use your details to answer this enquiry and to follow up with you one to one.';
/** The exact paragraph the compiler writes into an inquiry-only page. */
export const inquiryBasisMarkup=`<p id="capture-basis">${escapeHtml(inquiryBasisWording)}</p>`;
/** A page published before the disclosure existed lacks the paragraph, so its submissions record no basis. */
export const pageDisclosesInquiryBasis=(html:string)=>html.includes(inquiryBasisMarkup);
