import { useEffect, useRef } from "react";

function ChristmasTree({ className }: { className: string }) {
  return (
    <span className={`christmas-tree ${className}`}>
      <span className="christmas-tree-lights" />
    </span>
  );
}

export function ChristmasScene({
  placement,
}: {
  placement: "dashboard" | "landing" | "sidebar";
}) {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (
      placement !== "landing" ||
      !scene ||
      document.documentElement.dataset.season !== "christmas" ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          scene.dataset.inView = "true";
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(scene);
    return () => observer.disconnect();
  }, [placement]);

  return (
    <div
      ref={sceneRef}
      aria-hidden="true"
      className={`christmas-decoration christmas-scene christmas-scene--${placement}`}
    >
      {placement === "landing" && (
        <>
          <ChristmasTree className="christmas-tree--distant" />
          <ChristmasTree className="christmas-tree--companion" />
        </>
      )}
      {placement !== "sidebar" && (
        <ChristmasTree className="christmas-tree--small" />
      )}
      <ChristmasTree className="christmas-tree--large" />
      <span className="christmas-santa" />
    </div>
  );
}

export function ChristmasFlake() {
  return (
    <span
      aria-hidden="true"
      className="christmas-decoration christmas-flake icon-[tabler--snowflake]"
    />
  );
}
