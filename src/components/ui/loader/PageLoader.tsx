import HashLoader from "react-spinners/HashLoader";

export const PageLoader = () => {
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.8)", // optional: overlay effect
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999, // ensures it appears above all content
      }}
    >
      <HashLoader color="#36d7b7" size={80} />
    </div>
  );
};
