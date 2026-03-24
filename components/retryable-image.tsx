"use client";

import { useMemo, useState } from "react";

export function RetryableImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [retryToken, setRetryToken] = useState(0);
  const [retried, setRetried] = useState(false);

  const finalSrc = useMemo(() => {
    if (retryToken === 0) return src;
    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}retry=${retryToken}`;
  }, [src, retryToken]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (retried) return;
        setRetried(true);
        setRetryToken(Date.now());
      }}
    />
  );
}
