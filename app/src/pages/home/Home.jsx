import { useApi } from "../../context/ApiContext"

export default function Home() {

    // тест)

    const r = useApi()
    console.log(r) 

    return (
        <h1>Home</h1>
    )
}