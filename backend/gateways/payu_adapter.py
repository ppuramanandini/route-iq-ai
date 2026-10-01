from .mock_gateway import MockGatewayAdapter

class PayUAdapter(MockGatewayAdapter):
    def __init__(self):
        super().__init__(
            gateway_id="C",
            name="Gateway C (PayU-sim)",
            processor="Processor: PayU-sim",
            baseline_latency=310,
            baseline_success_rate=96.1
        )
