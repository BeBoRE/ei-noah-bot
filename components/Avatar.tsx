import React from 'react';
import { ExtendedUser } from '../lib/passport';
import styles from '../style/Avatar.module.css';

interface Props {
  user: ExtendedUser
  className?: string
}

export default function Avatar({ user, className = '' } : Props) {
  return <img className={`${className} ${styles.avatar}`} src={`https://cdn.discordapp.com/avatars/${user.user.id}/${user.avatar}.png`} alt={`${user.username}'s avatar`} />;
}

Avatar.defaultProps = {
  className: '',
};
