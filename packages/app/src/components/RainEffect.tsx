import { Box } from "@chakra-ui/react";
import { useEffect, useState } from "react";

export default function RainEffect() {
  const [splatActive, setSplatActive] = useState(true);
  const [backRowActive, setBackRowActive] = useState<any>(true);
  const [singleActive, setSingleActive] = useState<any>(false);
  const [drops, setDrops] = useState<any>([]);
  const [backDrops, setBackDrops] = useState<any>([]);

  useEffect(() => {
    makeItRain();
  }, [splatActive, backRowActive, singleActive]);

  const makeItRain = () => {
    let increment = 0;
    let newDrops = [];
    let newBackDrops = [];

    while (increment < 100) {
      const randoHundo = Math.floor(Math.random() * 98) + 1;
      const randoFiver = Math.floor(Math.random() * 4) + 2;
      increment += randoFiver;

      const styles = {
        left: increment + "%",
        bottom: randoFiver + randoFiver - 1 + 100 + "%",
        animationDelay: "0." + randoHundo + "s",
        animationDuration: "0.8" + randoHundo + "s",
      };

      newDrops.push(styles);
      newBackDrops.push(styles);
    }

    setDrops(newDrops);
    setBackDrops(newBackDrops);
  };

  return (
    <Box position="relative" h="100%">
      {drops.map((drop: any, index: number) => (
        <Box
          key={index}
          position="absolute"
          className="drop"
          style={{ ...drop }}
        >
          <Box
            className="stem"
            style={{
              animationDelay: drop.delay,
              animationDuration: drop.duration,
            }}
          />
          {splatActive && (
            <Box
              className="splat"
              style={{
                animationDelay: drop.delay,
                animationDuration: drop.duration,
              }}
            />
          )}
        </Box>
      ))}
      {backRowActive &&
        backDrops.map((drop: any, index: number) => (
          <Box
            key={index}
            position="absolute"
            className="drop back-row"
            style={{ ...drop }}
          >
            <Box
              className="stem"
              style={{
                animationDelay: drop.delay,
                animationDuration: drop.duration,
              }}
            />
            {splatActive && (
              <Box
                className="splat"
                style={{
                  animationDelay: drop.delay,
                  animationDuration: drop.duration,
                }}
              />
            )}
          </Box>
        ))}
      {/* Add toggles here if needed */}
    </Box>
  );
}
