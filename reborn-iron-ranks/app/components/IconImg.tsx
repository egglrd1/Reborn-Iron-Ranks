"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  fallbackSrc?: string;
};

export default function IconImg({
  src,
  alt,
  size = 24,
  className,
  style,
  title,
  fallbackSrc = "/items/placeholder.png",
}: Props) {
  const [cur, setCur] = useState(src);

  return (
    <img
      src={cur}
      alt={alt}
      width={size}
      height={size}
      title={title}
      className={className}
      style={{
        display: "block",
        width: size,
        height: size,
        objectFit: "contain",
        ...style,
      }}
      onError={() => {
        if (cur !== fallbackSrc) setCur(fallbackSrc);
      }}
      loading="lazy"
    />
  );
}
