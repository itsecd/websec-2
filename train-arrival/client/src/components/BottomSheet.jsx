export default function BottomSheet({ open, onToggle, children }) {
  return (
    <div className={`bottom-sheet ${open ? "open" : "collapsed"}`}>
      <button className="sheet-handle" onClick={onToggle}></button>
      <div className="sheet-content">{children}</div>
    </div>
  );
}