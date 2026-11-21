import {
  AbsoluteFill,
  CanvasImage,
  Easing,
  interpolate,
  Series,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import hotspots from "./hotspots.json";
import "./demo.css";

const createTitle = "Create your auction and share with others!";
const bidTitle = "Bid and discuss!";
const exchangeTitle = "Win and exchange offline";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" };

function FocusRing({ focus }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [left, top, width, height] = focus;

  return (
    <div
      className="focus-ring"
      style={{
        left: `calc(${left}% - 5px)`,
        top: `calc(${top}% - 5px)`,
        width: `calc(${width}% + 10px)`,
        height: `calc(${height}% + 10px)`,
        opacity: interpolate(frame, [0.22 * fps, 0.55 * fps], [0, 1], clamp),
      }}
    />
  );
}

function Screen({ shot, origin, zoom }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div className="screen">
      <div
        className="screen-content"
        style={{
          transformOrigin: origin,
          scale: interpolate(
            frame,
            [0, 3.8 * fps],
            [zoom, zoom + 0.025],
            clamp,
          ),
          opacity: interpolate(frame, [0, 0.24 * fps], [0.76, 1], clamp),
          translate: interpolate(
            frame,
            [0, 0.4 * fps],
            ["0px 10px", "0px 0px"],
            {
              ...clamp,
              easing: Easing.out(Easing.cubic),
            },
          ),
        }}
      >
        <CanvasImage src={staticFile(`${shot}.jpg`)} className="screen-image" />
        <FocusRing focus={hotspots[shot]} />
      </div>
    </div>
  );
}

function Shot({ title, subtitle, shot, origin = "50% 47%", zoom = 1 }) {
  return (
    <AbsoluteFill className="demo">
      <div className="demo-layout">
        <div className="demo-copy">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <Screen shot={shot} origin={origin} zoom={zoom} />
      </div>
    </AbsoluteFill>
  );
}

export function AuktivaDemo() {
  const { fps } = useVideoConfig();

  return (
    <Series>
      <Series.Sequence name="Create an auction" durationInFrames={4 * fps}>
        <Shot
          title={createTitle}
          subtitle="Name your auction and decide who can join."
          shot="create"
          zoom={1.035}
        />
      </Series.Sequence>
      <Series.Sequence name="Share the link" durationInFrames={4 * fps}>
        <Shot
          title={createTitle}
          subtitle="Add your items, then copy the auction link to share."
          shot="share"
          origin="77% 47%"
          zoom={1.04}
        />
      </Series.Sequence>
      <Series.Sequence name="Place a bid" durationInFrames={4 * fps}>
        <Shot
          title={bidTitle}
          subtitle="Open an item, see the current price, and place your bid."
          shot="bid"
          origin="60% 58%"
        />
      </Series.Sequence>
      <Series.Sequence name="Ask the seller" durationInFrames={4 * fps}>
        <Shot
          title={bidTitle}
          subtitle="Ask the seller a question right on the item page."
          shot="discuss"
          origin="26% 72%"
          zoom={1.12}
        />
      </Series.Sequence>
      <Series.Sequence name="See the winner" durationInFrames={4 * fps}>
        <Shot
          title={exchangeTitle}
          subtitle="Check the results when bidding closes."
          shot="win"
          origin="65% 65%"
        />
      </Series.Sequence>
      <Series.Sequence name="Arrange the exchange" durationInFrames={4 * fps}>
        <Shot
          title={exchangeTitle}
          subtitle="Contact the winner to arrange payment and pickup offline."
          shot="exchange"
          origin="70% 75%"
        />
      </Series.Sequence>
    </Series>
  );
}
