import { Center } from "@mantine/core";
import { NavLink } from "react-router-dom";

export default function LinkItem(props) {
    const {
        link,
        styles
    } = props;
    return (
        <NavLink
            key={link.label}
            to={link.link}
            className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.linkActive : ''}`
        }
        >
            <Center>
                <span className={styles.linkLabel}>
                    {link.label}
                </span>
            </Center>
        </NavLink>
    )
}