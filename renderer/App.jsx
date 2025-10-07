import React from 'react'
import './styles/tailwind.min.css'
import './styles/theme.css'
import HeaderBar from './components/HeaderBar'
import FooterBar from './components/FooterBar'
import BodyContent from './components/BodyContent'

export default function App() {
    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            <HeaderBar />
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <BodyContent />
            </div>
            <FooterBar />
        </div>
    )
}
