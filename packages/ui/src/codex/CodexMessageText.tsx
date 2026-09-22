import { MessageResponse, type MessageFileLinkTarget } from "@/components/ai-elements/message.js";
import { Button } from "@/components/ui/button.js";
import { messagePresentation } from "./messagePresentation.js";

export function CodexMessageText({
  text,
  workspacePath,
  onOpenFileLink,
  onSuggestion,
}: {
  text: string;
  workspacePath?: string;
  onOpenFileLink?: (target: MessageFileLinkTarget) => void;
  onSuggestion?: (prompt: string) => void;
}) {
  return (
    <div className="w-full min-w-0 max-w-full text-ui-base" data-conversation-selectable="true">
      {messagePresentation(text).map((part, index) =>
        part.kind === "markdown" ? (
          <MessageResponse
            key={index}
            workspacePath={workspacePath}
            renderZCodeFileCitations
            onOpenFileLink={onOpenFileLink}
          >
            {part.text}
          </MessageResponse>
        ) : (
          <Button
            key={index}
            variant="outline"
            size="sm"
            className="my-1 mr-2 max-w-full whitespace-normal text-left"
            disabled={!onSuggestion}
            onClick={() => onSuggestion?.(part.prompt)}
          >
            {part.text}
          </Button>
        ),
      )}
    </div>
  );
}
