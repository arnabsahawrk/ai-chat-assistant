const Skeleton = ({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) => <div className={`animate-pulse bg-surface-overlay rounded-lg ${className}`} style={style} />;

export default Skeleton;
