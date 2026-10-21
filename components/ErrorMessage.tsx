import { AlertIcon } from "./icons";
import styles from "./ErrorMessage.module.css";

export default function ErrorMessage({ message }: { message: string }) {
  return (
    <div className={styles.box} role="alert">
      <AlertIcon className={styles.icon} />
      <p>{message}</p>
    </div>
  );
}
