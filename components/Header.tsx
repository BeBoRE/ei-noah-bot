import Link from 'next/link';
import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { useUser } from '../lib/hooks/useUser';
import Avatar from './Avatar';
import styles from '../style/Header.module.css';

function HeaderUser() {
  const [user, { loading, mutate }] = useUser();

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    mutate(null, false);
  };

  if (loading) return <Col sm="auto" className={styles.name}>Retrieving User</Col>;
  if (user) {
    return (
      <Row>
        <Col sm="auto">
          <Avatar className={`cursor-pointer ${styles.avatar}`} user={user} />
        </Col>
        <Col sm="auto" className={styles.name}>
          <div><Link href={`/user/${user.user.id}`}><span className="cursor-pointer">{user.username}</span></Link></div>
          <div><button className="anchor" type="button" onClick={() => logout()}>Logout</button></div>
        </Col>
      </Row>
    );
  }
  return <Col sm="auto" className={styles.name}><Link href="/login">Login</Link></Col>;
}

export default function Header() {
  return (
    <div className={styles.header}>
      <Container>
        <Row className="justify-content-between">
          <Col sm="auto" />
          <Col sm="auto"><HeaderUser /></Col>
        </Row>
      </Container>
    </div>
  );
}
