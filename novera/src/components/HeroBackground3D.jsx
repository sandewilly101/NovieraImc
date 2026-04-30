export default function HeroBackground3D() {
    return (
        <div className="hero-bg-3d hero-bg-3d-fixed">
            <div className="scene-3d">

                <div className="floor">
                    <div className="floor-grid"></div>
                </div>

                <div className="wall-back"></div>

                <div className="wall-left"></div>

                <div className="stage">
                    <div className="stage-top"></div>
                    <div className="stage-front"></div>
                    <div className="stage-side"></div>

                    <div className="led-screen">
                        <div className="led-content">
                            <div className="led-bar"></div>
                            <div className="led-bar" style={{ width: '70%' }}></div>
                            <div className="led-bar" style={{ width: '85%' }}></div>
                            <div className="led-logo">NOVIRA</div>
                        </div>
                    </div>

                    <div className="podium"></div>
                </div>

                <div className="booth booth-a">
                    <div className="booth-top"></div>
                    <div className="booth-front"></div>
                    <div className="booth-side"></div>
                    <div className="booth-banner">A</div>
                </div>

                <div className="booth booth-b">
                    <div className="booth-top"></div>
                    <div className="booth-front"></div>
                    <div className="booth-side"></div>
                    <div className="booth-banner">B</div>
                </div>

                <div className="booth booth-c">
                    <div className="booth-top"></div>
                    <div className="booth-front"></div>
                    <div className="booth-side"></div>
                    <div className="booth-banner">C</div>
                </div>

                <div className="truss truss-left">
                    <div className="truss-bar"></div>
                    <div className="spotlight spot-1"></div>
                    <div className="spotlight spot-2"></div>
                    <div className="spotlight spot-3"></div>
                </div>

                <div className="truss truss-right">
                    <div className="truss-bar"></div>
                    <div className="spotlight spot-1"></div>
                    <div className="spotlight spot-2"></div>
                    <div className="spotlight spot-3"></div>
                </div>

                <div className="truss truss-top">
                    <div className="truss-bar-h"></div>
                    <div className="spotlight spot-down-1"></div>
                    <div className="spotlight spot-down-2"></div>
                    <div className="spotlight spot-down-3"></div>
                </div>

                <div className="light-beam beam-1"></div>
                <div className="light-beam beam-2"></div>
                <div className="light-beam beam-3"></div>

                <div className="particle p1"></div>
                <div className="particle p2"></div>
                <div className="particle p3"></div>
                <div className="particle p4"></div>
                <div className="particle p5"></div>
            </div>

            <div className="hero-bg-overlay"></div>
        </div>
    );
}
