from .mock_gateway import MockGatewayAdapter

class RazorpayAdapter(MockGatewayAdapter):
    def __init__(self):
        super().__init__(
            gateway_id="A",
            name="Gateway A (Razorpay-sim)",
            processor="Processor: Razorpay-sim",
            baseline_latency=180,
            baseline_success_rate=98.4
        )
