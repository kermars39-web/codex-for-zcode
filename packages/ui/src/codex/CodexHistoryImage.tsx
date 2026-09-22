import { useEffect, useState } from "react";
import { useServices } from "@/hooks/useServices.js";

export function CodexHistoryImage({ source }: { source: string }) {
  const { fileService } = useServices();
  const [url, setUrl] = useState<string>();
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let active = true;
    setMissing(false);
    setUrl(undefined);
    if (!source.startsWith("/")) {
      if (/^(data:image\/|https?:\/\/)/.test(source)) setUrl(source);
      else setMissing(true);
    } else {
      void fileService
        .readMediaPreview({ path: source, maxBytes: 10 * 1024 * 1024 })
        .then((r) => {
          if (active) setUrl(`data:${r.mediaType};base64,${r.dataBase64}`);
        })
        .catch(() => {
          if (active) setMissing(true);
        });
    }
    return () => {
      active = false;
    };
  }, [fileService, source]);
  if (missing)
    return (
      <p className="rounded border border-border p-3 text-ui-xs text-foreground-subtle">
        图片附件不可用：{source.startsWith("/") ? source.split("/").at(-1) : "历史图片"}
      </p>
    );
  if (!url) return <p className="text-ui-xs text-foreground-subtle">正在读取图片…</p>;
  return (
    <img
      src={url}
      alt="对话图片"
      className="max-h-72 max-w-full rounded-lg object-contain"
      onError={() => setMissing(true)}
    />
  );
}
