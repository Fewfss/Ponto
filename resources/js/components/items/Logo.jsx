import { useEffect, useRef } from "react";
import gsap from "gsap";
import "./Logo.css";

function Logo() {
  const stageRef = useRef(null);
  const wordRef = useRef(null);
  const dotRef = useRef(null);
  const charsRef = useRef([]);
  const isAnimating = useRef(false);

  const animate = () => {
    if (isAnimating.current) return;

    isAnimating.current = true;

    const word = wordRef.current;
    const dot = dotRef.current;
    const chars = charsRef.current;

    if (!word || !dot) return;

    const wordRect = word.getBoundingClientRect();
    const dotRect = dot.getBoundingClientRect();

    const startX = -wordRect.width - dotRect.width - 40;
    const centerY = -wordRect.height * 0.15;

    const timeline = gsap.timeline({
      onComplete: () => {
        isAnimating.current = false;
      },
    });

    // Configuração inicial
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

    // 1. Ponto gigante desliza e revela a palavra
    timeline
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

      // 2. Desce para a linha de base
      .to(dot, {
        y: 0,
        duration: 0.3,
        ease: "power3.in",
      })

      // 3. Impacto / Squash
      .to(dot, {
        scaleX: 1.4,
        scaleY: 0.6,
        duration: 0.08,
        ease: "power2.out",
      })

      // 4. Quique elástico / Stretch
      .to(dot, {
        scaleX: 0.8,
        scaleY: 1.25,
        y: -28,
        duration: 0.16,
        ease: "power2.out",
      })

      // 5. Assentamento na linha de base
      .to(dot, {
        scaleX: 1,
        scaleY: 1,
        y: 0,
        duration: 0.25,
        ease: "bounce.out",
      });
  };

  useEffect(() => {
    document.fonts.ready.then(() => {
      animate();
    });
  }, []);

  return (
    <div
      className="stage"
      ref={stageRef}
      onClick={animate}
    >
      <div className="word" ref={wordRef}>
        {["p", "o", "n", "t", "o"].map((char, index) => (
          <span
            className="char"
            key={index}
            ref={(element) => {
              charsRef.current[index] = element;
            }}
          >
            {char}
          </span>
        ))}
      </div>

      <div
        className="dot"
        ref={dotRef}
      />
    </div>
  );
}

export default Logo;
