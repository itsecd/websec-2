import { Burger, Container, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import styles from './Header.module.scss';
import LinkItem from './link-item/LinkItem';
import AppName from './app-name/AppName';
import { links } from '../../сonstants/for-header';


export default function Header() {
  const [opened, { toggle }] = useDisclosure(false);

  const items = links.map((link, id) => (
    <LinkItem key={"item-header12345"+id} link={link} styles={styles} />
  ));

  return (
    <header className={styles.header}>
      <Container size="md">
        <div className={styles.inner}>
          <AppName styles={styles}/>
          <Group gap={5} visibleFrom="sm" className={styles.nav}>
            {items}
          </Group>
          <Burger opened={opened} onClick={toggle} size="sm" hiddenFrom="sm" />
          {opened && (
            <div className={styles.mobileMenu}>
              <Group gap={5} direction="column">
                {items}
              </Group>
            </div>
          )}
        </div>
      </Container>
    </header>
  );
}