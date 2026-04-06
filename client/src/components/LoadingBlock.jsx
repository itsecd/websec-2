export function LoadingBlock({ text = "Загрузка..." }) {
    return (
        <div className="loading-block" role="status" aria-live="polite">
            <span className="loading-block__dot" />
            <span>{text}</span>
        </div>
    );
}
