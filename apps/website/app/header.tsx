import Image from "next/image";
import Link from "next/link";
import ei from "../public/ei.png";
import HeaderUser from "./_components/HeaderUser";

function Header() {
  return (
    <header className="bg-primary-900 flex place-content-center min-h-[4rem]">
      <div className="flex place-content-between container py-1">
        <div className="flex items-stretch place-items-center flex-1">
          <Link className="flex place-items-center gap-1" href='/'>
            <Image alt="ei Noah Logo" src={ei} width={30} height={30} />
            <h1 className="text-xl font-bold text-primary-300">ei Noah</h1>
          </Link>
        </div>
        <div className="flex place-items-center">
          <HeaderUser />
        </div>
      </div>
    </header>
  );
}

export default Header;
