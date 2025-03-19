import { useState, useMemo, forwardRef, useRef } from "react";
import { TextInput, Popover, Text, Box } from "@mantine/core";
import { FixedSizeList } from "react-window";
import Row from "./row/Row";

const CustomSelect = forwardRef(
  (
    {
      label,
      placeholder,
      data,
      value,
      onChange,
      disabled,
      searchable,
      clearable,
      mb,
      onItemsRendered,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const listRef = useRef(null); 
    const [scrollOffset, setScrollOffset] = useState(0); 
    const inputRef = useRef(null); 

    const filteredItems = useMemo(() => {
      if (!searchQuery) return data;
      return data.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [data, searchQuery]);

    const selectedItem = data.find((item) => item.value === value);

    const handleSelect = (val) => {
      onChange(val);
      setIsOpen(false);
      setSearchQuery(""); 
    };

    const handleScroll = ({ scrollOffset }) => {
      setScrollOffset(scrollOffset);
    };

    const handleMouseDown = (event) => {
      event.preventDefault(); 
    };

    const VirtualList = () => (
      <FixedSizeList
        ref={listRef}
        height={Math.min(filteredItems.length * 36, 300)}
        width="100%"
        itemCount={filteredItems.length}
        itemSize={36} 
        itemData={{
          items: filteredItems,
          onSelect: handleSelect,
          selectedValue: value,
        }}
        onItemsRendered={onItemsRendered}
        onScroll={handleScroll} 
        initialScrollOffset={scrollOffset} 
        style={{
          scrollbarWidth: "thin", 
          scrollbarColor: "#888 #e0e0e0", 
          overflowY: "auto", 
        }}
      >
        {Row}
      </FixedSizeList>
    );

    return (
      <Popover
        width="target" 
        position="bottom-start"
        opened={isOpen}
        onChange={setIsOpen}
        disabled={disabled}
        withinPortal
      >
        <Popover.Target>
          <TextInput
            ref={(node) => {
              inputRef.current = node; 
              if (typeof ref === "function") {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            label={label}
            placeholder={placeholder}
            value={searchable && isOpen ? searchQuery : selectedItem?.label || ""}
            onChange={(event) => searchable && setSearchQuery(event.currentTarget.value)}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              setTimeout(() => {
                if (!document.activeElement.closest(".mantine-Popover-dropdown")) {
                  setIsOpen(false);
                  setSearchQuery(""); 
                }
              }, 100);
            }}
            disabled={disabled}
            mb={mb}
            rightSection={
              clearable && value ? (
                <Text
                  onClick={() => onChange(null)}
                  style={{ cursor: "pointer", color: "gray" }}
                >
                  ✕
                </Text>
              ) : null
            }
            styles={{
              input: { cursor: disabled ? "not-allowed" : "pointer" },
            }}
          />
        </Popover.Target>
        <Popover.Dropdown
          p={0}
          onMouseDown={handleMouseDown} 
          style={{
            maxHeight: 300, 
            overflow: "hidden", 
            border: "1px solid #e0e0e0", 
            backgroundColor: "white", 
          }}
        >
          {filteredItems.length > 0 ? (
            <VirtualList />
          ) : (
            <Text p="xs" color="dimmed">
              Ничего не найдено
            </Text>
          )}
        </Popover.Dropdown>
      </Popover>
    );
  }
);

export default CustomSelect;