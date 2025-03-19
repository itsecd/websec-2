import { Title } from "@mantine/core";
import { NavLink } from "react-router-dom";

export default function AppName({ styles }) {
    return (
        <Title order={3} size="h4">
            <NavLink to="/" className={styles.logo}>
              Прибывалка
            </NavLink>
        </Title>
    )
}