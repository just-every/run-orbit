import type { ChangeEvent } from "react";

export const DRAFT_SUBJECT_MAX_LENGTH = 998;
export const DRAFT_BODY_MAX_LENGTH = 100000;

type DraftContentFieldsProps = {
  subject: string;
  body: string;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  disabled?: boolean;
};

export function DraftContentFields({ subject, body, onSubjectChange, onBodyChange, disabled = false }: DraftContentFieldsProps) {
  const changeSubject = (event: ChangeEvent<HTMLInputElement>) => onSubjectChange(event.target.value);
  const changeBody = (event: ChangeEvent<HTMLTextAreaElement>) => onBodyChange(event.target.value);

  return <>
    <label>Subject
      <input data-testid="draft-subject" disabled={disabled} maxLength={DRAFT_SUBJECT_MAX_LENGTH} onChange={changeSubject} required value={subject} />
    </label>
    <label>Body
      <textarea data-testid="draft-body" disabled={disabled} maxLength={DRAFT_BODY_MAX_LENGTH} onChange={changeBody} required value={body} />
    </label>
  </>;
}
