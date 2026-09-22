import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import styles from "./Logo.css";

function Logo() {
  const containerRef = useRef(null);
  const charsRef = useRef([]);
  const dotRef = useRef(null);
  const wordRef = useRef(null);
  const animationRef = useRef(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const chars = charsRef.current;
    const dot = dotRef.current;
    const word = wordRef.current;

    if (!container || !dot || !word) return;

    const ctx = gsap.context(() => {
      const animate = () => {
        if (animationRef.current?.isActive()) return;

        const wordRect = word.getBoundingClientRect();
        const dotRect = dot.getBoundingClientRect();

        const startX = -wordRect.width - dotRect.width - 40;
        const centerY = -wordRect.height * 0.15;

        gsap.set(chars, {
          opacity: 0,
          scale: 0.8,
        });

        gsap.set(dot, {
          x: startX,
          y: centerY,
          scaleX: 1,
          scaleY: 1,
        });

        animationRef.current = gsap.timeline()
          .to(dot, {
            x: 0,
            duration: 1.2,
            ease: "power1.inOut",
          })
          .to(
            chars,
            {
              opacity: 1,
              scale: 1,
              duration: 0.25,
              stagger: 0.18,
              ease: "power2.out",
            },
            "-=1.1"
          )
          .to(dot, {
            y: 0,
            duration: 0.3,
            ease: "power3.in",
          })
          .to(dot, {
            scaleX: 1.4,
            scaleY: 0.6,
            duration: 0.08,
            ease: "power2.out",
          })
          .to(dot, {
            scaleX: 0.8,
            scaleY: 1.25,
            y: -28,
            duration: 0.16,
            ease: "power2.out",
          })
          .to(dot, {
            scaleX: 1,
            scaleY: 1,
            y: 0,
            duration: 0.25,
            ease: "bounce.out",
          });
      };

      const handleClick = () => {
        animate();
      };

      container.addEventListener("click", handleClick);

      document.fonts.ready.then(() => {
        animate();
      });

      return () => {
        container.removeEventListener("click", handleClick);
      };
    }, containerRef);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div ref={containerRef} className={styles.container}>
      <div ref={wordRef} className={styles.word}>
        {["p", "o", "n", "t", "o"].map((char, index) => (
          <span
            key={index}
            ref={(element) => {
              charsRef.current[index] = element;
            }}
            className={styles.char}
          >
            {char}
          </span>
        ))}
      </div>

      <div ref={dotRef} className={styles.dot} />

      <div className={styles.hint}>
        Clique para repetir
      </div>
    </div>
  );
}

export default Logo;