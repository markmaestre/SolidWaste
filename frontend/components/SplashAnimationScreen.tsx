import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from "react-native";

const { width, height } = Dimensions.get("window");

const C = {
  bg: "#001f3f",
  green: "#00ff88",
  greenDim: "#00cc66",
  blue: "#0077ff",
  white: "#ffffff",
  whiteFaint: "rgba(255,255,255,0.08)",
  whiteDim: "rgba(255,255,255,0.25)",
};

const STATUS_MESSAGES = [
  "Initializing AI model...",
  "Calibrating scanner...",
  "Loading waste database...",
  "Preparing environment...",
  "Almost ready!",
];

// ─── Particle ─────────────────────────────────────────────────────────────────
function Particle({
  x,
  delay,
  size,
  color,
}: {
  x: number;
  delay: number;
  size: number;
  color: string;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -(height * 0.85),
            duration: 5000 + Math.random() * 3000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        bottom: 0,
        left: x,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

// ─── Scan Line ────────────────────────────────────────────────────────────────
function ScanLine() {
  const translateY = useRef(new Animated.Value(-28)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 28,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -28,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[styles.scanLine, { opacity, transform: [{ translateY }] }]}
    />
  );
}

// ─── Rotating Ring ────────────────────────────────────────────────────────────
function RotatingRing({
  size,
  duration,
  color,
  reverse = false,
  dashed = false,
}: {
  size: number;
  duration: number;
  color: string;
  reverse?: boolean;
  dashed?: boolean;
}) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ["360deg", "0deg"] : ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: dashed ? 1 : 1.5,
        borderColor: color,
        borderStyle: dashed ? "dashed" : "solid",
        transform: [{ rotate: spin }],
      }}
    />
  );
}

// ─── Pulse Dot ────────────────────────────────────────────────────────────────
function PulseDot({ delay }: { delay: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.6, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ]),
        Animated.delay(800),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={{
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: C.green,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

// ─── Main Splash Screen ───────────────────────────────────────────────────────
interface Props {
  onFinish: () => void;
}

export default function SplashAnimationScreen({ onFinish }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const loaderOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const statusOpacity = useRef(new Animated.Value(1)).current;

  const [statusText, setStatusText] = useState(STATUS_MESSAGES[0]);

  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * (width - 10),
      delay: Math.random() * 4000,
      size: 2 + Math.floor(Math.random() * 3),
      color: [C.green, C.greenDim, "#66ffbb", C.blue][Math.floor(Math.random() * 4)],
    }))
  ).current;

  useEffect(() => {
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % STATUS_MESSAGES.length;
      Animated.timing(statusOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setStatusText(STATUS_MESSAGES[idx]);
        Animated.timing(statusOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(titleTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(loaderOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.timing(progressWidth, {
      toValue: width * 0.55,
      duration: 5000,
      useNativeDriver: false,
    }).start(() => {
      Animated.timing(logoOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onFinish());
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Ambient orbs */}
      <View style={[styles.orb, styles.orbTL]} />
      <View style={[styles.orb, styles.orbBR]} />
      <View style={[styles.orb, styles.orbCenter]} />

      {/* Particles */}
      <View style={StyleSheet.absoluteFill}>
        {particles.map((p) => (
          <Particle key={p.id} x={p.x} delay={p.delay} size={p.size} color={p.color} />
        ))}
      </View>

      {/* Corner accents */}
      <View style={[styles.cornerAccent, styles.ctl]} />
      <View style={[styles.cornerAccent, styles.ctr]} />
      <View style={[styles.cornerAccent, styles.cbl]} />
      <View style={[styles.cornerAccent, styles.cbr]} />

      {/* Main content */}
      <View style={styles.content}>

        {/* Logo */}
        <Animated.View
          style={[
            styles.logoWrap,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
        >
          <RotatingRing size={180} duration={14000} color="rgba(0,255,136,0.15)" />
          <RotatingRing size={160} duration={9000} color="rgba(0,255,136,0.1)" dashed reverse />
          <RotatingRing size={140} duration={6000} color="rgba(0,255,136,0.18)" />
          <View style={styles.ringDot} />

          <View style={styles.logoBox}>
            <View style={[styles.scanCorner, styles.scTL]} />
            <View style={[styles.scanCorner, styles.scTR]} />
            <View style={[styles.scanCorner, styles.scBL]} />
            <View style={[styles.scanCorner, styles.scBR]} />
            <View style={styles.targetOuter}>
              <View style={styles.targetInner} />
            </View>
            <ScanLine />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ translateY: titleTranslate }],
            alignItems: "center",
          }}
        >
          <Text style={styles.appTitle}>
            T.M<Text style={styles.appTitleAccent}>F.K</Text>
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
        WASTE INNOVATIONS
        </Animated.Text>

        {/* Loader */}
        <Animated.View style={[styles.loaderWrap, { opacity: loaderOpacity }]}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
          </View>

          <View style={styles.dotsRow}>
            <PulseDot delay={0} />
            <View style={{ width: 6 }} />
            <PulseDot delay={200} />
            <View style={{ width: 6 }} />
            <PulseDot delay={400} />
          </View>

          <Animated.Text style={[styles.statusText, { opacity: statusOpacity }]}>
            {statusText}
          </Animated.Text>
        </Animated.View>

      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>POWERED BY AI</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const CORNER_SIZE = 28;
const SCAN_CORNER_SIZE = 14;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  orb: {
    position: "absolute",
    borderRadius: 9999,
    opacity: 0.08,
  },
  orbTL: {
    width: 280,
    height: 280,
    backgroundColor: C.green,
    top: -100,
    left: -100,
  },
  orbBR: {
    width: 240,
    height: 240,
    backgroundColor: C.blue,
    bottom: 0,
    right: -80,
  },
  orbCenter: {
    width: 180,
    height: 180,
    backgroundColor: C.greenDim,
    top: height * 0.35, // FIXED: number, hindi string
    alignSelf: "center",
  },
  cornerAccent: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    opacity: 0.5,
  },
  ctl: {
    top: 48,
    left: 24,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: C.green,
    borderTopLeftRadius: 4,
  },
  ctr: {
    top: 48,
    right: 24,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: C.green,
    borderTopRightRadius: 4,
  },
  cbl: {
    bottom: 48,
    left: 24,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: C.green,
    borderBottomLeftRadius: 4,
  },
  cbr: {
    bottom: 48,
    right: 24,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: C.green,
    borderBottomRightRadius: 4,
  },
  content: {
    alignItems: "center",
  },
  logoWrap: {
    width: 180,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  ringDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.green,
    top: 0,
    elevation: 8,
  },
  logoBox: {
    width: 90,
    height: 90,
    borderRadius: 22,
    backgroundColor: "rgba(0,255,136,0.06)",
    borderWidth: 1,
    borderColor: "rgba(0,255,136,0.3)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  scanCorner: {
    position: "absolute",
    width: SCAN_CORNER_SIZE,
    height: SCAN_CORNER_SIZE,
  },
  scTL: {
    top: 8,
    left: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: C.green,
    borderTopLeftRadius: 2,
  },
  scTR: {
    top: 8,
    right: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: C.green,
    borderTopRightRadius: 2,
  },
  scBL: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: C.green,
    borderBottomLeftRadius: 2,
  },
  scBR: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: C.green,
    borderBottomRightRadius: 2,
  },
  targetOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(0,255,136,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  targetInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.green,
  },
  scanLine: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.green,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: C.white,
    letterSpacing: 6,
    marginBottom: 8,
  },
  appTitleAccent: {
    color: C.green,
  },
  tagline: {
    fontSize: 10,
    fontWeight: "300",
    color: "rgba(0,255,136,0.55)",
    letterSpacing: 5,
    marginBottom: 52,
    marginTop: 4,
  },
  loaderWrap: {
    width: width * 0.55,
    alignItems: "center",
  },
  progressTrack: {
    width: "100%",
    height: 2,
    backgroundColor: C.whiteFaint,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.green,
    borderRadius: 2,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  statusText: {
    fontSize: 11,
    letterSpacing: 2,
    color: C.whiteDim,
    fontWeight: "300",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 10,
    letterSpacing: 3,
    color: "rgba(255,255,255,0.15)",
    fontWeight: "400",
  },
});