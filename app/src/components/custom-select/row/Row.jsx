import { Text } from "@mantine/core";

const Row = ({ data, index, style }) => {
    const item = data.items[index];
    if (!item) return null;
    return (
      <Text
        style={{
          ...style,
          cursor: "pointer",
          height: 36, 
          lineHeight: "36px",
          boxSizing: "border-box", 
          padding: "0 8px", 
          overflow: "hidden", 
          textOverflow: "ellipsis", 
          whiteSpace: "nowrap", 
        }}
        onMouseDown={() => data.onSelect(item.value)}
        bg={data.selectedValue === item.value ? "gray.1" : "transparent"}
      >
        {item.label}
      </Text>
    );
};
export default Row;